import { Address, Cell, serializeTuple, TupleItem } from '@ton/core'
import ExecWorker from './ExecutorWorkerWrapper?worker'
import * as Comlink from 'comlink'
import { RunCommonType } from './ExecutorWorkerWrapper'

const ExecutorWorkerInst = Comlink.wrap<RunCommonType>(new ExecWorker())

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

function runCommonArgsToInternalParams(args: RunCommonArgs): EmulationInternalParams {
  return {
    utime: args.now,
    lt: args.lt.toString(),
    rand_seed: args.randomSeed === null ? '' : args.randomSeed.toString('hex'),
    ignore_chksig: args.ignoreChksig,
    debug_enabled: args.debugEnabled,
  }
}

export class ManagedExecutor {
  private debugLogs: string[] = []

  static async create() {
    const ex = new ManagedExecutor()

    return ex
  }

  async runGetMethod(args: GetMethodArgs): Promise<GetMethodResult> {
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

    const resultString = await ExecutorWorkerInst.runGet(
      JSON.stringify(params),
      stack.toBoc().toString('base64'),
      args.config
    )
    const resp = JSON.parse(resultString)

    const debugLogs = this.debugLogs.join('\n')

    if (resp.fail) {
      console.error(resp)
      throw new Error('Unknown emulation error')
    }

    return {
      output: resp.output,
      logs: resp.logs,
      debugLogs,
    }
  }

  private async runCommon(args: (string | number)[]): Promise<EmulationResult> {
    const res = await ExecutorWorkerInst.runCommon(args)
    return res
    // this.debugLogs = []
    // const resp = JSON.parse(this.extractString(this.invoke('_emulate', args)))
    // const debugLogs = this.debugLogs.join('\n')
  }

  async runTickTock(args: RunTickTockArgs): Promise<EmulationResult> {
    const params: EmulationInternalParams = {
      ...runCommonArgsToInternalParams(args),
      is_tick_tock: true,
      is_tock: args.which === 'tock',
    }

    return await this.runCommon([
      await ExecutorWorkerInst.getEmulatorPointer(args.config, verbosityToNum[args.verbosity]),
      args.libs?.toBoc().toString('base64') ?? 0,
      args.shardAccount,
      '',
      JSON.stringify(params),
    ])
  }

  async runTransaction(args: RunTransactionArgs): Promise<EmulationResult> {
    const params: EmulationInternalParams = runCommonArgsToInternalParams(args)

    return await this.runCommon([
      await ExecutorWorkerInst.getEmulatorPointer(args.config, verbosityToNum[args.verbosity]),
      args.libs?.toBoc().toString('base64') ?? 0,
      args.shardAccount,
      args.message.toBoc().toString('base64'),
      JSON.stringify(params),
    ])
  }
}
