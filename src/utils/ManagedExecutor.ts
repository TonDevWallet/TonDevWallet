import { Address, Cell, serializeTuple, TupleItem } from '@ton/core'
import { invoke } from '@tauri-apps/api/core'
import ExecWorker from './ExecutorWorkerWrapper?worker'
import * as Comlink from 'comlink'
import { RunCommonType } from './ExecutorWorkerWrapper'
import { IExecutor } from '@ton/sandbox'
import { tvmStackSlotsToStackBoc, type TvmStackSlotJson } from './tvmStackCodec'

const ExecutorWorkerInst = Comlink.wrap<RunCommonType>(new ExecWorker())

function useNativeTvm(): boolean {
  return true // typeof import.meta.env.TAURI_ENV_PLATFORM === 'string'
}

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

type GetMethodInternalParams = {
  code: string
  data: string
  verbosity: number
  libs: string
  address: string
  unixtime: number
  balance: string
  rand_seed: string
  gas_limit: string
  method_id: number
  debug_enabled: boolean
}

type EmulationInternalParams = {
  utime: number
  lt: string
  rand_seed: string
  ignore_chksig: boolean
  debug_enabled: boolean
  is_tick_tock?: boolean
  is_tock?: boolean
}

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

const verbosityToNum: Record<ExecutorVerbosity, number> = {
  short: 0,
  full: 1,
  full_location: 2,
  full_location_gas: 3,
  full_location_stack: 4,
  full_location_stack_verbose: 5,
}

function libsCellToBase64OrNull(libs: Cell | null | undefined): string | null {
  if (!libs) return null
  if (libs.bits.length === 0 && libs.refs.length === 0) return null
  return libs.toBoc().toString('base64')
}

function runCommonArgsToInternalParams(args: RunCommonArgs): EmulationInternalParams {
  return {
    utime: args.now,
    lt: args.lt.toString(),
    rand_seed: args.randomSeed === null ? '' : args.randomSeed.toString('hex'),
    ignore_chksig: args.ignoreChksig,
    debug_enabled: args.debugEnabled,
  }
}

function parseEmulationResponse(resp: {
  fail?: boolean
  output?: Record<string, unknown>
  logs?: string
}): EmulationResult {
  const debugLogs = ''
  if (resp.fail) {
    console.error(resp)
    throw new Error('Unknown emulation error')
  }
  const logs: string = typeof resp.logs === 'string' ? resp.logs : ''
  const raw = resp.output as Record<string, unknown> | undefined
  if (!raw) {
    throw new Error('TVM emulation: missing output')
  }
  const success = raw.success === true
  if (success) {
    return {
      result: {
        success: true,
        transaction: String(raw.transaction),
        shardAccount: String(raw.shard_account),
        vmLog: String(raw.vm_log ?? ''),
        actions: raw.actions === null || raw.actions === undefined ? null : String(raw.actions),
      },
      logs,
      debugLogs,
    }
  }
  const vmLog = typeof raw.vm_log === 'string' ? raw.vm_log : ''
  const vmExitCode = typeof raw.vm_exit_code === 'number' ? raw.vm_exit_code : 0
  return {
    result: {
      success: false,
      error: String(raw.error ?? 'Emulation failed'),
      vmResults:
        'vm_exit_code' in raw
          ? {
              vmLog,
              vmExitCode,
            }
          : undefined,
    },
    logs,
    debugLogs,
  }
}

export class ManagedExecutor implements IExecutor {
  private debugLogs: string[] = []

  static async create() {
    console.log('create managed executor')
    return new ManagedExecutor()
  }

  async runGetMethod(args: GetMethodArgs): Promise<GetMethodResult> {
    console.log('run managed get method', args)
    const params: GetMethodInternalParams = {
      code: args.code.toBoc().toString('base64'),
      data: args.data.toBoc().toString('base64'),
      verbosity: verbosityToNum[args.verbosity],
      libs: args.libs?.toBoc().toString('base64') ?? '',
      address: args.address.toString(),
      unixtime: args.unixTime,
      balance: args.balance.toString(),
      rand_seed: args.randomSeed.toString('hex'),
      gas_limit: args.gasLimit.toString(),
      method_id: args.methodId,
      debug_enabled: args.debugEnabled,
    }

    const stack = serializeTuple(args.stack)

    this.debugLogs = []

    let resultString: string
    if (useNativeTvm()) {
      resultString = await invoke<string>('tvm_run_get_method', {
        req: {
          configParamsBoc: args.config,
          codeBoc: params.code,
          dataBoc: params.data,
          address: params.address,
          unixtime: params.unixtime,
          balance: params.balance,
          randSeedHex: params.rand_seed,
          gasLimit: params.gas_limit,
          methodId: params.method_id,
          stackBoc: stack.toBoc().toString('base64'),
          libsBoc: libsCellToBase64OrNull(args.libs),
          verbosity: params.verbosity,
          debugEnabled: params.debug_enabled,
        },
      })
    } else {
      resultString = await ExecutorWorkerInst.runGet(
        JSON.stringify(params),
        stack.toBoc().toString('base64'),
        args.config
      )
    }

    const resp = JSON.parse(resultString) as {
      fail?: boolean
      output?: Record<string, unknown> & { stackSlots?: TvmStackSlotJson[] }
      logs?: string
    }

    const debugLogs = this.debugLogs.join('\n')

    if (resp.fail) {
      console.error(resp)
      throw new Error('Unknown emulation error')
    }

    const out = resp.output
    if (out && Array.isArray(out.stackSlots) && out.stackSlots.length > 0) {
      out.stack = tvmStackSlotsToStackBoc(out.stackSlots)
      delete out.stackSlots
    }

    return {
      output: out as GetMethodResult['output'],
      logs: typeof resp.logs === 'string' ? resp.logs : '',
      debugLogs,
    }
  }

  private async runCommonWorker(args: (string | number)[]): Promise<EmulationResult> {
    return ExecutorWorkerInst.runCommon(args)
  }

  private async runCommonNative(
    args: RunCommonArgs,
    messageBoc: string,
    isTickTock: boolean,
    isTock: boolean
  ): Promise<EmulationResult> {
    console.log('run common native', args, messageBoc, isTickTock, isTock)
    const p = runCommonArgsToInternalParams(args)
    const raw = await invoke<string>('tvm_emulate_transaction', {
      req: {
        configParamsBoc: args.config,
        shardAccountBoc: args.shardAccount,
        messageBoc,
        libsBoc: libsCellToBase64OrNull(args.libs),
        unixtime: p.utime,
        lt: p.lt,
        randSeedHex: p.rand_seed || '0'.repeat(64),
        ignoreChksig: p.ignore_chksig,
        isTickTock,
        isTock,
        prevBlocksInfoBoc: null,
        verbosity: verbosityToNum[args.verbosity],
        debugEnabled: args.debugEnabled,
      },
    })
    return parseEmulationResponse(
      JSON.parse(raw) as { fail?: boolean; output?: Record<string, unknown>; logs?: string }
    )
  }

  async runTickTock(args: RunTickTockArgs): Promise<EmulationResult> {
    const params = runCommonArgsToInternalParams(args)
    params.is_tick_tock = true
    params.is_tock = args.which === 'tock'

    if (useNativeTvm()) {
      return this.runCommonNative(args, '', true, args.which === 'tock')
    }

    return this.runCommonWorker([
      await ExecutorWorkerInst.getEmulatorPointer(args.config, verbosityToNum[args.verbosity]),
      args.libs?.toBoc().toString('base64') ?? 0,
      args.shardAccount,
      '',
      JSON.stringify(params),
    ])
  }

  async runTransaction(args: RunTransactionArgs): Promise<EmulationResult> {
    const params = runCommonArgsToInternalParams(args)

    if (useNativeTvm()) {
      return this.runCommonNative(args, args.message.toBoc().toString('base64'), false, false)
    }

    return this.runCommonWorker([
      await ExecutorWorkerInst.getEmulatorPointer(args.config, verbosityToNum[args.verbosity]),
      args.libs?.toBoc().toString('base64') ?? 0,
      args.shardAccount,
      args.message.toBoc().toString('base64'),
      JSON.stringify(params),
    ])
  }

  invoke(): number {
    throw new Error('not implemented')
  }
}
