use serde_json::json;
use std::{env, fs, path::PathBuf, process};
use ton_block::{base64_encode, write_boc, Account, ConfigParams, Deserializable, Serializable, ShardAccount, Transaction, UInt256};

fn fail(message: impl AsRef<str>) -> ! {
    eprintln!("FAIL: {}", message.as_ref());
    process::exit(1);
}

fn b64_cell<T: Serializable>(value: &T) -> String {
    let cell = value.serialize().unwrap_or_else(|err| fail(format!("serialize failed: {err}")));
    base64_encode(write_boc(&cell).unwrap_or_else(|err| fail(format!("write_boc failed: {err}"))))
}

fn main() {
    let base = env::args().nth(1).unwrap_or_else(|| "vendor/ton-rust-node/src/executor/real_boc".to_string());
    let out = env::args().nth(2).unwrap_or_else(|| "fixtures/tvm-emulate-request.json".to_string());
    let base = PathBuf::from(base);

    let account_path = base.join("simple_account_old.boc");
    let tx_path = base.join("simple_transaction.boc");
    let config_path = base.join("config.boc");

    let account = Account::construct_from_file(account_path.to_str().unwrap())
        .unwrap_or_else(|err| fail(format!("read account failed: {err}")));
    let tx = Transaction::construct_from_file(tx_path.to_str().unwrap())
        .unwrap_or_else(|err| fail(format!("read transaction failed: {err}")));
    let config = ConfigParams::construct_from_file(config_path.to_str().unwrap())
        .unwrap_or_else(|err| fail(format!("read config failed: {err}")));

    let shard = ShardAccount::with_params(&account, UInt256::default(), 0)
        .unwrap_or_else(|err| fail(format!("build shard account failed: {err}")));
    let msg_cell = tx
        .in_msg_cell()
        .unwrap_or_else(|| fail("fixture transaction has no inbound message"));
    let config_root = config.root().cloned().unwrap_or_else(|| fail("config has no root"));

    let fixture = json!({
        "configParamsBoc": base64_encode(write_boc(&config_root).unwrap()),
        "shardAccountBoc": b64_cell(&shard),
        "messageBoc": base64_encode(write_boc(&msg_cell).unwrap()),
        "libsBoc": null,
        "unixtime": tx.now(),
        "lt": tx.logical_time().to_string(),
        "randSeedHex": "0000000000000000000000000000000000000000000000000000000000000000",
        "ignoreChksig": false,
        "isTickTock": false,
        "isTock": false,
        "prevBlocksInfoBoc": null,
        "verbosity": 5,
        "debugEnabled": true
    });

    let out = PathBuf::from(out);
    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent).unwrap_or_else(|err| fail(format!("create output dir failed: {err}")));
    }
    fs::write(&out, serde_json::to_string_pretty(&fixture).unwrap())
        .unwrap_or_else(|err| fail(format!("write fixture failed: {err}")));
    println!("wrote {}", out.display());
}
