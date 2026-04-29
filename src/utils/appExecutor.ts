// import { Executor } from '@ton/sandbox'
import type { IExecutor } from '@ton/sandbox/dist/executor/Executor'

/**
 * Creates a fresh `IExecutor` for `Blockchain.create({ executor })` from `@ton/sandbox`.
 *
 * **Backends**
 * - **Tauri desktop** (`TAURI_ENV_PLATFORM` set): `ManagedExecutor` using ton-rust-node crates in the Rust sidecar
 *   (`tvm_emulate_transaction` / `tvm_run_get_method`). Requires `src-tauri/vendor/ton-rust-node` (see `src-tauri/Cargo.toml`).
 * - `VITE_TON_EXECUTOR=managed` (non-Tauri / dev web): `ManagedExecutor` + ExecutorWorker (Web Worker + WASM).
 * - Default: sandbox `Executor` (same as the implicit default).
 */
export async function createAppExecutor(): Promise<IExecutor> {
  // if (typeof import.meta.env.TAURI_ENV_PLATFORM === 'string') {
  //   const { ManagedExecutor } = await import('./ManagedExecutor')
  //   return ManagedExecutor.create()
  // }
  // if (import.meta.env.VITE_TON_EXECUTOR === 'managed') {
  //   const { ManagedExecutor } = await import('./ManagedExecutor')
  //   return ManagedExecutor.create()
  // }

  const { ManagedExecutor } = await import('./ManagedExecutor')
  return ManagedExecutor.create()
  // return Executor.create()
}
