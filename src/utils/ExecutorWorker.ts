import { Address, Cell, TupleItem } from '@ton/core'
import { base64Decode } from './base64'
import EmulatorModule from './emscripten'

import { EmulatorEmscriptenWasm } from './emulator.wasm'

export type ExecutorVerbosity =
  | 'short'
  | 'full'
  | 'full_location'
  | 'full_location_gas'
  | 'full_location_stack'
  | 'full_location_stack_verbose'

export type GetMethodArgs = {
  code: Cell
  data: Cell
  methodId: number
  stack: TupleItem[]
  config: string
  verbosity: ExecutorVerbosity
  libs?: Cell
  address: Address
  unixTime: number
  balance: bigint
  randomSeed: Buffer
  gasLimit: bigint
  debugEnabled: boolean
}

export type GetMethodResultSuccess = {
  success: true
  stack: string
  gas_used: string
  vm_exit_code: number
  vm_log: string
  missing_library: string | null
}

export type GetMethodResultError = {
  success: false
  error: string
}

export type GetMethodResult = {
  output: GetMethodResultSuccess | GetMethodResultError
  logs: string
  debugLogs: string
}

export type RunCommonArgs = {
  config: string
  libs: Cell | null
  verbosity: ExecutorVerbosity
  shardAccount: string
  now: number
  lt: bigint
  randomSeed: Buffer | null
  ignoreChksig: boolean
  debugEnabled: boolean
}

export type RunTransactionArgs = {
  message: Cell
} & RunCommonArgs

export type TickOrTock = 'tick' | 'tock'

export type RunTickTockArgs = {
  which: TickOrTock
} & RunCommonArgs

type ResultSuccess = {
  success: true
  transaction: string
  shard_account: string
  vm_log: string
  actions: string | null
}

type ResultError = {
  success: false
  error: string
} & (
  | {
      vm_log: string
      vm_exit_code: number
    }
  // eslint-disable-next-line @typescript-eslint/ban-types
  | {}
)

export type EmulationResultSuccess = {
  success: true
  transaction: string
  shardAccount: string
  vmLog: string
  actions: string | null
}

export type VMResults = {
  vmLog: string
  vmExitCode: number
}

export type EmulationResultError = {
  success: false
  error: string
  vmResults?: VMResults
}

export type EmulationResult = {
  result: EmulationResultSuccess | EmulationResultError
  logs: string
  debugLogs: string
}

class Pointer {
  length: number
  rawPointer: number
  inUse: boolean = true

  constructor(length: number, rawPointer: number) {
    this.length = length
    this.rawPointer = rawPointer
  }

  alloc() {
    this.inUse = true
  }

  free() {
    this.inUse = false
  }
}

class Heap {
  private pointers: Pointer[] = []
  private module: any
  private maxPtrs: number = 0

  constructor(module: any) {
    this.module = module
  }

  getPointersForStrings(strs: string[]): number[] {
    this.maxPtrs = Math.max(this.maxPtrs, strs.length)
    const sorted = strs.map((str, i) => ({ str, i })).sort((a, b) => b.str.length - a.str.length)
    const ptrs = sorted
      .map((e) => ({ i: e.i, ptr: this.getCStringPointer(e.str) }))
      .sort((a, b) => a.i - b.i)
      .map((e) => e.ptr.rawPointer)
    this.pointers.sort((a, b) => b.length - a.length)
    this.pointers.slice(this.maxPtrs).forEach((ptr) => this.module._free(ptr.rawPointer))
    this.pointers = this.pointers.slice(0, this.maxPtrs)
    this.pointers.forEach((p) => p.free())
    return ptrs
  }

  getCStringPointer(data: string) {
    const length = this.module.lengthBytesUTF8(data) + 1

    const existing = this.pointers.find((p) => p.length >= length && !p.inUse)

    if (existing) {
      this.module.stringToUTF8(data, existing.rawPointer, length)
      existing.alloc()
      return existing
    }

    const len = this.module.lengthBytesUTF8(data) + 1
    const ptr = this.module._malloc(len)
    this.module.stringToUTF8(data, ptr, len)
    const pointer = new Pointer(length, ptr)
    this.pointers.push(new Pointer(length, ptr))
    return pointer
  }
}
const module = await EmulatorModule({
  wasmBinary: base64Decode(EmulatorEmscriptenWasm),
  printErr: () => {},
})
const heap = new Heap(module)

// export function

export class ExecutorWorker {
  private emulator?: {
    ptr: number
    config: string
    verbosity: number
  }

  runCommon(args: (string | number)[]): EmulationResult {
    //   const debugLogs = []
    const resp = JSON.parse(extractString(invoke('_emulate_with_emulator', args)))
    const debugLogs = '' // this.debugLogs.join('\n')
    if (resp.fail) {
      console.error(resp)
      throw new Error('Unknown emulation error')
    }
    const logs: string = resp.logs
    const result: ResultSuccess | ResultError = resp.output
    return {
      result: result.success
        ? {
            success: true,
            transaction: result.transaction,
            shardAccount: result.shard_account,
            vmLog: result.vm_log,
            actions: result.actions,
          }
        : {
            success: false,
            error: result.error,
            vmResults:
              'vm_log' in result
                ? {
                    vmLog: result.vm_log,
                    vmExitCode: result.vm_exit_code,
                  }
                : undefined,
          },
      logs,
      debugLogs,
    }
  }

  async runGet(params: string, stack: string, config: string) {
    const invokePointer = await this.invoke('_run_get_method', [params, stack, config])
    const resultString = await this.extractString(invokePointer)
    return resultString
  }

  getEmulatorPointer(config: string, verbosity: number) {
    if (
      this.emulator === undefined ||
      verbosity !== this.emulator.verbosity ||
      config !== this.emulator.config
    ) {
      this.createEmulator(config, verbosity)
    }

    return this.emulator!.ptr
  }

  private createEmulator(config: string, verbosity: number) {
    if (this.emulator !== undefined) {
      this.invoke('_destroy_emulator', [this.emulator.ptr])
    }
    const ptr = this.invoke('_create_emulator', [config, verbosity])
    this.emulator = {
      ptr,
      config,
      verbosity,
    }
  }

  private invoke(method: string, args: (number | string)[]): number {
    const invocationArgs: number[] = []
    const strArgs: { str: string; i: number }[] = []
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (typeof arg === 'string') {
        strArgs.push({ str: arg, i })
      } else {
        invocationArgs[i] = arg
      }
    }
    const strPtrs = heap.getPointersForStrings(strArgs.map((e) => e.str))
    for (let i = 0; i < strPtrs.length; i++) {
      invocationArgs[strArgs[i].i] = strPtrs[i]
    }

    return module[method](...invocationArgs)
  }

  private extractString(ptr: number): string {
    const str = module.UTF8ToString(ptr)
    module._free(ptr)
    return str
  }
}

function invoke(method: string, args: (number | string)[]): number {
  const invocationArgs: number[] = []
  const strArgs: { str: string; i: number }[] = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (typeof arg === 'string') {
      strArgs.push({ str: arg, i })
    } else {
      invocationArgs[i] = arg
    }
  }
  const strPtrs = heap.getPointersForStrings(strArgs.map((e) => e.str))
  for (let i = 0; i < strPtrs.length; i++) {
    invocationArgs[strArgs[i].i] = strPtrs[i]
  }

  return module[method](...invocationArgs)
}

function extractString(ptr: number): string {
  const str = module.UTF8ToString(ptr)
  module._free(ptr)
  return str
}
