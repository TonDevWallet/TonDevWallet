//! TVM emulation via ton-rust-node Rust crates (no C FFI).
//! Requires vendored sources: `git clone --depth 1 https://github.com/RSquad/ton-rust-node.git src-tauri/vendor/ton-rust-node`

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{mem, sync::{Arc, Mutex}};
use ton_api::ton::tvm::StackEntry;
use ton_block::messages::{MsgAddressInt, StateInit};
use ton_block::master::McStateExtra;
use ton_block::shard::{ShardIdent, ShardStateUnsplit};
use ton_block::{
    base64_decode, base64_encode, error, read_single_root_boc, write_boc, Account, Cell,
    ConfigParams, CurrencyCollection, Deserializable, HashUpdate, HashmapE, Result as TbResult,
    Serializable, ShardAccount, SliceData, TransactionTickTock, UInt256, DICT_HASH_MIN_CELLS,
};
use ton_executor::{
    BlockchainConfig, ExecuteParams, ExecutorError, OrdinaryTransactionExecutor,
    TickTockTransactionExecutor, TransactionExecutor,
};
use ton_vm::executor::gas::gas_state::Gas;
use ton_vm::executor::{BehaviorModifiers, Engine, EngineTraceInfo, EngineTraceInfoType};
use ton_vm::smart_contract_info::{
    convert_stack, convert_ton_stack, PrevBlocksInfo, SmartContractInfo,
};
use ton_vm::stack::{read_stack_item, savelist::SaveList, Stack, StackItem};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct TvmEmulateRequest {
    pub config_params_boc: String,
    pub shard_account_boc: String,
    pub message_boc: String,
    pub libs_boc: Option<String>,
    pub unixtime: u32,
    /// Logical time as decimal string (may exceed JS `Number` safe integer).
    pub lt: String,
    pub rand_seed_hex: String,
    pub ignore_chksig: bool,
    pub is_tick_tock: bool,
    pub is_tock: bool,
    pub prev_blocks_info_boc: Option<String>,
    pub verbosity: Option<u8>,
    pub debug_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct TvmRunGetMethodRequest {
    pub config_params_boc: String,
    pub code_boc: String,
    pub data_boc: String,
    pub address: String,
    pub unixtime: u32,
    pub balance: String,
    pub rand_seed_hex: String,
    pub gas_limit: String,
    pub method_id: i32,
    pub stack_boc: String,
    pub libs_boc: Option<String>,
    pub verbosity: Option<u8>,
    pub debug_enabled: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum StackSlotJson {
    Null,
    Int { dec: String },
    Nan,
    Cell { b64: String },
    Slice { b64: String },
    Tuple { items: Vec<StackSlotJson> },
}

struct RunGetMethodWithLogsResult {
    gas_used: i64,
    stack: Vec<StackEntry>,
    exit_code: i32,
    vm_log: String,
}

fn cell_from_config_b64(s: &str) -> TbResult<Cell> {
    let data = base64_decode(s.as_bytes())?;
    read_single_root_boc(data)
}

fn libs_cell_from_b64_opt(s: &str) -> TbResult<Option<Cell>> {
    if s.is_empty() { return Ok(None); }
    let cell = cell_from_config_b64(s)?;
    if cell.bit_length() == 0 && cell.references_count() == 0 {
        return Ok(None);
    }
    Ok(Some(cell))
}

fn shard_from_b64(s: &str) -> TbResult<ShardAccount> {
    let cell = cell_from_config_b64(s)?;
    ShardAccount::construct_from_cell(cell)
}

fn parse_stack_boc_to_entries(stack_boc_base64: &str) -> TbResult<Vec<StackEntry>> {
    let cell = cell_from_config_b64(stack_boc_base64)?;
    let mut slice = SliceData::load_cell(cell)?;
    let depth = slice.get_next_int(24)? as usize;
    let mut items = Vec::with_capacity(depth);
    for _ in 0..depth {
        let rest = slice.checked_drain_reference()?;
        let item = read_stack_item(&mut slice)?;
        items.insert(0, item);
        slice = SliceData::load_cell(rest)?;
    }
    convert_stack(&items)
}

fn stack_item_to_json(item: &StackItem) -> StackSlotJson {
    match item {
        StackItem::None => StackSlotJson::Null,
        StackItem::Integer(arc) => {
            if arc.as_ref().is_nan() {
                StackSlotJson::Nan
            } else {
                StackSlotJson::Int { dec: arc.to_str() }
            }
        }
        StackItem::Cell(c) => StackSlotJson::Cell {
            b64: base64_encode(write_boc(c).unwrap_or_default()),
        },
        StackItem::Slice(s) => StackSlotJson::Slice {
            b64: base64_encode(write_boc(&s.clone().into_cell().unwrap_or_default()).unwrap_or_default()),
        },
        StackItem::Tuple(arc) => StackSlotJson::Tuple {
            items: arc.iter().map(stack_item_to_json).collect(),
        },
        StackItem::Builder(_) | StackItem::Continuation(_) => StackSlotJson::Null,
    }
}

fn build_mc_state_cell(config_root: Cell, unixtime: u32, gen_lt: u64) -> TbResult<Cell> {
    let mut mc_extra = McStateExtra::default();
    mc_extra.config = ConfigParams::with_root(config_root)?;
    let mut mc_state = ShardStateUnsplit::with_ident(ShardIdent::masterchain());
    mc_state.set_global_id(-239);
    mc_state.set_gen_time(unixtime);
    mc_state.set_gen_lt(gen_lt);
    mc_state.set_seq_no(1);
    mc_state.write_custom(Some(&mc_extra))?;
    mc_state.serialize()
}

fn format_trace_line(engine: &Engine, info: &EngineTraceInfo) -> String {
    match info.info_type {
        EngineTraceInfoType::Dump => info.cmd_str.clone(),
        EngineTraceInfoType::Start => "".to_string(),
        EngineTraceInfoType::Finish => "".to_string(),
        EngineTraceInfoType::Exception => {
            let stack = info.stack.iter().map(|item| item.dump_as_fift()).collect::<Vec<_>>().join(" ");
            let exception = info.cmd_str.clone();
            format!("stack: [ {stack} ]\nhandling exception code {exception}")
        }
        EngineTraceInfoType::Normal | EngineTraceInfoType::Implicit => {
            let stack = info.stack.iter().map(|item| item.dump_as_fift()).collect::<Vec<_>>().join(" ");
            let mut lines = vec![format!("stack: [ {stack} ]")];
            lines.push(format!("gas remaining: {}", engine.gas_remaining() + info.gas_cmd));
            if let Ok(cell) = info.cmd_code.cell() {
                lines.push(format!("code cell hash: {:X} offset: {}", cell.repr_hash(), info.cmd_code.pos()));
            }
            let cmd = match info.cmd_str.as_str() {
                "POP s0" => "POP".to_string(),
                "POP s1" => "NIP".to_string(),
                "PUSH s0" => "DUP".to_string(),
                "PUSH s1" => "OVER".to_string(),
                "SWAP s0,s1" => "SWAP".to_string(),
                "XCHG s0,s1" => "XCHG s1".to_string(),
                "XCHG s0,s2" => "XCHG s2".to_string(),
                "XCHG s0,s3" => "XCHG s3".to_string(),
                _ => info.cmd_str.as_str().to_string(),
            };
            lines.push(format!("execute {cmd}"));
            lines.join("\n")
        }
    }
}

fn make_trace_callback(logs: Arc<Mutex<String>>) -> Arc<ton_vm::executor::TraceCallback> {
    Arc::new(move |engine, info| {
        let mut guard = logs.lock().unwrap();
        let line = format_trace_line(engine, info);
        if !line.is_empty() {
            if !guard.is_empty() {
                guard.push('\n');
            }
            guard.push_str(&line);
        }
    })
}

fn run_smc_method_with_logs(
    shard_account: &ShardAccount,
    mc_state_cell: Cell,
    method_id: u32,
    stack: Vec<StackEntry>,
    state_libs: HashmapE,
    verbosity: u8,
    debug_enabled: bool,
    gas_limit: u64,
) -> TbResult<RunGetMethodWithLogsResult> {
    let account = shard_account.read_account()?;
    let code = account.get_code().ok_or_else(|| error!("Account has no code"))?;
    let data = account.get_data().unwrap_or_default();
    let smc_info = SmartContractInfo::with_params(Some(&account), None, Some(mc_state_cell.clone()))?;

    let mut storage = convert_ton_stack(&stack)?;
    storage.push(StackItem::int(method_id));
    let stack = Stack::with_storage(storage);

    let mut ctrls = SaveList::new();
    ctrls.put(7, smc_info.as_temp_data_item())?;
    ctrls.put(4, StackItem::Cell(data))?;

    let gas_limit = i64::try_from(gas_limit).unwrap_or(i64::MAX);
    let gas = Gas::new(gas_limit, 0, gas_limit, gas_limit);
    let libraries = vec![account.libraries().inner(), state_libs];
    let caps = smc_info.config_params.capabilities();
    let mut vm = Engine::with_capabilities(caps).setup_checked(code, ctrls, stack, gas, libraries)?;
    let block_version = smc_info.config_params.get_global_version()?.version;
    vm.set_block_version(block_version);

    let vm_logs = Arc::new(Mutex::new(String::new()));
    vm.set_arc_trace_callback(make_trace_callback(vm_logs.clone()));
    vm.set_trace(if debug_enabled || verbosity > 0 { Engine::TRACE_ALL } else { Engine::TRACE_NONE });

    let result = vm.execute();
    let mut stack = mem::take(&mut vm.withdraw_stack().storage);
    let gas_used = vm.gas_used();
    let exit_code = match result {
        Ok(exit_code) => exit_code,
        Err(err) => {
            stack.pop();
            ton_vm::error::tvm_exception_or_custom_code(&err)
        }
    };
    let vm_log = vm_logs.lock().unwrap().clone();
    let stack = convert_stack(&stack)?;
    Ok(RunGetMethodWithLogsResult { gas_used, stack, exit_code, vm_log })
}

fn emulate_inner(
    config_params: ConfigParams,
    mut shard_acc: ShardAccount,
    in_msg_cell: Option<Cell>,
    is_tock: bool,
    unixtime: u32,
    lt: u64,
    rand_seed: UInt256,
    ignore_chksig: bool,
    libs: Option<Cell>,
    prev_blocks_info: PrevBlocksInfo,
    verbosity: u8,
    debug_enabled: bool,
) -> TbResult<(String, String)> {
    let config = BlockchainConfig::with_config(config_params.clone())
        .map_err(|e| error!("Failed to create BlockchainConfig: {}", e))?;

    let executor: Box<dyn TransactionExecutor> = if in_msg_cell.is_some() {
        Box::new(OrdinaryTransactionExecutor::new(config))
    } else {
        Box::new(TickTockTransactionExecutor::new(config, TransactionTickTock::new(is_tock)))
    };
    let last_tr_lt = lt;
    let block_lt = last_tr_lt - last_tr_lt % 1_000_000;
    let behavior_modifiers = Some(BehaviorModifiers { chksig_always_succeed: ignore_chksig });
    let vm_logs = Arc::new(Mutex::new(String::new()));
    let params = ExecuteParams {
        block_lt,
        last_tr_lt,
        block_unixtime: unixtime,
        seed_block: rand_seed,
        state_libs: HashmapE::with_hashmap(256, libs),
        behavior_modifiers,
        prev_blocks_info,
        debug: debug_enabled || verbosity > 0,
        trace_callback: Some(make_trace_callback(vm_logs.clone())),
        ..Default::default()
    };
    let mut account = shard_acc.read_account()?;
    let now = std::time::Instant::now();
    let result = executor.execute_with_params(in_msg_cell, &mut account, params);
    let elapsed_time = now.elapsed().as_micros() as i64;
    let vm_log = vm_logs.lock().unwrap().clone();
    let result = match result {
        Ok(mut transaction) => {
            transaction.set_prev_trans_lt(shard_acc.last_trans_lt());
            transaction.set_prev_trans_hash(shard_acc.last_trans_hash().clone());
            let old_hash = shard_acc.account_hash();
            shard_acc.write_account(&account)?;
            let new_hash = shard_acc.account_hash();
            let hash_update = HashUpdate::with_hashes(old_hash, new_hash);
            transaction.write_state_update(&hash_update)?;
            let tr_cell = transaction.serialize()?;
            shard_acc.set_last_trans_hash(tr_cell.repr_hash());
            shard_acc.set_last_trans_lt(transaction.logical_time());
            json!({
                "success": true,
                "transaction": base64_encode(write_boc(&tr_cell)?),
                "shard_account": shard_acc.write_to_base64()?,
                "vm_log": vm_log,
                "actions": serde_json::Value::Null,
                "elapsed_time": elapsed_time,
            })
        }
        Err(err) => {
            if let Some(ExecutorError::NoAcceptError(vm_exit_code, _)) = err.downcast_ref() {
                json!({
                    "success": false,
                    "error": "External message not accepted by smart contract",
                    "external_not_accepted": true,
                    "vm_log": vm_log,
                    "vm_exit_code": vm_exit_code,
                    "elapsed_time": elapsed_time,
                })
            } else {
                json!({
                    "success": false,
                    "error": err.to_string(),
                    "external_not_accepted": false,
                })
            }
        }
    };
    Ok((format!("{result:#}"), vm_log))
}

fn parse_prev_blocks(prev_boc: Option<&str>) -> TbResult<PrevBlocksInfo> {
    let Some(s) = prev_boc.filter(|x| !x.is_empty()) else {
        return Ok(PrevBlocksInfo::default());
    };
    let cell = cell_from_config_b64(s)?;
    let mut slice = SliceData::load_cell(cell)?;
    let info = read_stack_item(&mut slice)?;
    if info.is_tuple() {
        Ok(PrevBlocksInfo::Tuple(info))
    } else {
        Ok(PrevBlocksInfo::Tuple(StackItem::tuple(Vec::new())))
    }
}

/// Same envelope as the emscripten worker: `{ fail, output, logs }`.
pub fn tvm_emulate_transaction_json(req: TvmEmulateRequest) -> Result<String, String> {
    (|| -> TbResult<String> {
        let config_root = cell_from_config_b64(&req.config_params_boc)?;
        let config_params = ConfigParams::with_root(config_root)?;
        let shard_acc = shard_from_b64(&req.shard_account_boc)?;
        let in_msg = if req.message_boc.is_empty() {
            None
        } else {
            Some(cell_from_config_b64(&req.message_boc)?)
        };
        let libs = match req.libs_boc.as_deref() {
            Some(s) => libs_cell_from_b64_opt(s)?,
            None => None,
        };
        let rand_seed: UInt256 = if req.rand_seed_hex.is_empty() {
            UInt256::default()
        } else {
            req.rand_seed_hex.parse().map_err(|e| error!("rand_seed: {}", e))?
        };
        let lt: u64 = req.lt.parse().map_err(|e| error!("lt: {}", e))?;
        let prev = parse_prev_blocks(req.prev_blocks_info_boc.as_deref())?;
        let (inner, vm_log) = emulate_inner(
            config_params,
            shard_acc,
            in_msg,
            req.is_tock,
            req.unixtime,
            lt,
            rand_seed,
            req.ignore_chksig,
            libs,
            prev,
            req.verbosity.unwrap_or(1),
            req.debug_enabled.unwrap_or(false),
        )?;
        let inner_val: serde_json::Value =
            serde_json::from_str(&inner).map_err(|e| error!("inner json: {}", e))?;
        let wrapped = json!({
            "fail": false,
            "output": inner_val,
            "logs": vm_log,
        });
        Ok(wrapped.to_string())
    })()
    .map_err(|e| e.to_string())
}

pub fn tvm_run_get_method_json(req: TvmRunGetMethodRequest) -> Result<String, String> {
    (|| -> TbResult<String> {
        let config_root = cell_from_config_b64(&req.config_params_boc)?;
        let config_params = ConfigParams::with_root(config_root)?;
        let cfg_cell = config_params
            .root()
            .ok_or_else(|| error!("config has no root"))?
            .clone();

        let code = cell_from_config_b64(&req.code_boc)?;
        let data = cell_from_config_b64(&req.data_boc)?;
        let addr: MsgAddressInt = req.address.parse().map_err(|e| error!("address: {}", e))?;
        let balance_u128: u128 = req.balance.parse().map_err(|e| error!("balance: {}", e))?;
        let balance_u64: u64 = balance_u128.try_into().unwrap_or(u64::MAX);

        let mut state = StateInit::default();
        state.set_code(code);
        state.set_data(data);
        let libs = match req.libs_boc.as_deref() {
            Some(s) => libs_cell_from_b64_opt(s)?,
            None => None,
        };
        let state_libs = HashmapE::with_hashmap(256, libs);
        if let Some(ref lb) = req.libs_boc {
            if let Some(lib_cell) = libs_cell_from_b64_opt(lb)? {
                state.set_library(lib_cell);
            }
        }

        let gas_limit: u64 = req.gas_limit.parse().unwrap_or(10_000_000);

        let account = Account::active(
            addr,
            CurrencyCollection::with_coins(balance_u64),
            0,
            req.unixtime,
            state,
            DICT_HASH_MIN_CELLS,
        )?;
        let shard_acc = ShardAccount::with_params(&account, UInt256::default(), 0)?;
        let mc_cell = build_mc_state_cell(cfg_cell, req.unixtime, 0)?;
        let stack_entries = parse_stack_boc_to_entries(&req.stack_boc)?;
        let rr = run_smc_method_with_logs(
            &shard_acc,
            mc_cell,
            req.method_id as u32,
            stack_entries,
            state_libs,
            req.verbosity.unwrap_or(1),
            req.debug_enabled.unwrap_or(false),
            gas_limit,
        )?;

        let vm_stack_items = convert_ton_stack(&rr.stack)?;
        let stack_slots: Vec<StackSlotJson> = vm_stack_items.iter().map(stack_item_to_json).collect();

        let output = json!({
            "success": true,
            "stack": "",
            "stackSlots": stack_slots,
            "gas_used": rr.gas_used.to_string(),
            "vm_exit_code": rr.exit_code,
            "vm_log": rr.vm_log,
            "missing_library": serde_json::Value::Null,
        });

        let wrapped = json!({
            "fail": false,
            "output": output,
            "logs": output.get("vm_log").and_then(|v| v.as_str()).unwrap_or_default(),
        });
        Ok(wrapped.to_string())
    })()
    .map_err(|e| e.to_string())
}
