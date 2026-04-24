use app_lib::tvm_runner::{tvm_emulate_transaction_json, TvmEmulateRequest};
use serde_json::Value;
use std::{env, fs, process};

fn fail(message: impl AsRef<str>) -> ! {
    eprintln!("FAIL: {}", message.as_ref());
    process::exit(1);
}

fn main() {
    let path = env::args()
        .nth(1)
        .unwrap_or_else(|| fail("usage: cargo run --bin tvm_cli_probe -- <emulate-request.json>"));

    let input = fs::read_to_string(&path)
        .unwrap_or_else(|err| fail(format!("failed to read {path}: {err}")));
    let req: TvmEmulateRequest = serde_json::from_str(&input)
        .unwrap_or_else(|err| fail(format!("invalid TvmEmulateRequest JSON: {err}")));

    let raw = tvm_emulate_transaction_json(req)
        .unwrap_or_else(|err| fail(format!("emulation returned error: {err}")));
    let value: Value = serde_json::from_str(&raw)
        .unwrap_or_else(|err| fail(format!("invalid emulator JSON response: {err}")));

    if value.get("fail").and_then(Value::as_bool).unwrap_or(true) {
        fail(format!("emulator fail envelope: {raw}"));
    }

    let output = value.get("output").unwrap_or_else(|| fail("missing output"));
    if !output.get("success").and_then(Value::as_bool).unwrap_or(false) {
        fail(format!("emulation was not successful: {output}"));
    }

    let tx_ok = output.get("transaction").and_then(Value::as_str).is_some_and(|s| !s.is_empty());
    let shard_ok = output
        .get("shard_account")
        .and_then(Value::as_str)
        .is_some_and(|s| !s.is_empty());
    if !tx_ok || !shard_ok {
        fail("missing transaction or shard_account BOC");
    }

    let logs = output
        .get("vm_log")
        .and_then(Value::as_str)
        .or_else(|| value.get("logs").and_then(Value::as_str))
        .unwrap_or_default();
    if logs.trim().is_empty() {
        fail("VM logs are empty");
    }

    if !logs.contains("stack: ") || !logs.contains("gas remaining: ") || !logs.contains("execute ") {
        fail("VM logs are not compatible with web parser markers");
    }

    let chunks: Vec<&str> = logs.split("stack: ").skip(1).collect();
    if chunks.is_empty() {
        fail("VM logs do not contain parseable stack chunks");
    }

    let mut checked_chunks = 0;
    for chunk in chunks.iter().take(10) {
        let lines: Vec<&str> = chunk.lines().filter(|l| !l.trim().is_empty()).collect();
        if lines.is_empty() { continue; }
        if !lines[0].starts_with('[') { fail("VM log stack chunk does not start with '['"); }
        let has_gas_remaining = lines.iter().any(|line| line.trim().starts_with("gas remaining: "));
        let has_execute = lines.iter().any(|line| line.trim().starts_with("execute "));
        if !has_gas_remaining || !has_execute { fail("VM log stack chunk lacks gas remaining or execute line"); }
        checked_chunks += 1;
    }
    if checked_chunks == 0 { fail("VM logs contain no checked parser chunks"); }

    println!("PASS: emulation ok, transaction/shard_account present, vm_log_len={}, parsed_chunks={}", logs.len(), chunks.len());
}
