import { ConnectMessageTransactionMessage } from '@/types/connect'
import { ImmutableArray, State } from '@hookstate/core'
import { Address, Cell } from '@ton/ton'
import { parseInternal } from '@truecarry/tlb-abi'

export interface ToncenterMessage {
  method: string
  headers: {
    'Content-Type': string
  }
  body: string
}

export interface MoneyFlow {
  outputs: bigint
  inputs: bigint
  jettonTransfers: {
    from: Address
    to: Address
    jetton: Address | null
    amount: bigint
  }[]
  ourAddress: Address | null
}

export interface ToncenterEmulationResult {
  result: any
}

export interface ToncenterEmulationHook {
  emulation: ToncenterEmulationResult
  moneyFlow: MoneyFlow
  isCorrect: boolean
  error: string | null
}

/**
 * Creates a toncenter message payload for emulation
 */
export function createToncenterMessage(
  walletAddress: string | undefined,
  messages: State<ImmutableArray<ConnectMessageTransactionMessage>>
): ToncenterMessage {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: walletAddress,
      valid_until: Math.floor(Date.now() / 1000) + 60,
      include_code_data: true,
      include_address_book: true,
      include_metadata: true,
      with_actions: true,
      messages: messages.get(),
    }),
  }
}

/**
 * Fetches toncenter emulation result
 */
export async function fetchToncenterEmulation(
  message: ToncenterMessage
): Promise<ToncenterEmulationResult> {
  const response = await fetch('https://toncenter.com/api/emulate/v1/emulateTonConnect', message)
  if (!response.ok) {
    throw new Error('Failed to fetch toncenter emulation result')
  }
  const result = await response.json()
  return { result }
}

/**
 * Processes toncenter emulation result to extract money flow
 */
export function processToncenterMoneyFlow(emulation: ToncenterEmulationResult): MoneyFlow {
  if (!emulation || !emulation.result) {
    return {
      outputs: 0n,
      inputs: 0n,
      jettonTransfers: [],
      ourAddress: null,
    }
  }

  const firstTx = emulation.result.transactions[emulation.result.trace.tx_hash]

  // Get all transactions for our account
  const ourTxes = Object.values(emulation.result.transactions).filter(
    (t: any) => t.account === firstTx.account
  ) as any[]

  const messagesFrom = ourTxes.flatMap((t) => t.out_msgs)
  const messagesTo = ourTxes.flatMap((t) => t.in_msg)

  // Calculate TON outputs
  const outputs = messagesFrom.reduce((acc, m) => {
    if (m.value) {
      return acc + BigInt(m.value)
    }
    return acc + 0n
  }, 0n)

  // Calculate TON inputs
  const inputs = messagesTo.reduce((acc, m) => {
    if (m.value) {
      return acc + BigInt(m.value)
    }
    return acc + 0n
  }, 0n)

  // Process jetton transfers
  const jettonTransfers: {
    from: Address
    to: Address
    jetton: Address | null
    amount: bigint
  }[] = []

  for (const t of Object.values(emulation.result.transactions as any[])) {
    if (!t.in_msg?.source) {
      continue
    }

    const parsed = parseInternal(Cell.fromBase64(t.in_msg.message_content.body).beginParse())

    if (parsed?.internal !== 'jetton_transfer') {
      continue
    }

    const from = Address.parse(t.in_msg.source)
    const to = parsed.data.destination instanceof Address ? parsed.data.destination : null
    if (!to) {
      continue
    }
    const jettonAmount = parsed.data.amount

    const metadata = emulation.result.metadata[t.account]
    if (!metadata || !metadata?.token_info) {
      continue
    }

    const tokenInfo = metadata.token_info.find((t: any) => t.valid && t.type === 'jetton_wallets')

    if (!tokenInfo) {
      continue
    }

    const jettonAddress = Address.parse(tokenInfo.extra.jetton)

    jettonTransfers.push({
      from,
      to,
      jetton: jettonAddress,
      amount: jettonAmount,
    })
  }

  return {
    outputs,
    inputs,
    jettonTransfers,
    ourAddress: Address.parse(firstTx.account),
  }
}

/**
 * Validates toncenter money flow against local money flow
 */
export function validateToncenterMoneyFlow(
  toncenterFlow: MoneyFlow,
  localFlow: MoneyFlow
): { isValid: boolean; error: string | null } {
  if (!toncenterFlow?.ourAddress || !localFlow?.ourAddress) {
    return { isValid: false, error: 'Missing wallet addresses' }
  }

  if (toncenterFlow.outputs !== localFlow.outputs) {
    console.log('Wrong toncenter money flow outputs', toncenterFlow.outputs, localFlow.outputs)
    return { isValid: false, error: 'Wrong toncenter money flow outputs' }
  }

  if (toncenterFlow.inputs !== localFlow.inputs) {
    console.log('Wrong toncenter money flow inputs', toncenterFlow.inputs, localFlow.inputs)
    return {
      isValid: false,
      error: `Wrong toncenter money flow inputs: ${toncenterFlow.inputs} ${localFlow.inputs}`,
    }
  }

  if (toncenterFlow.jettonTransfers.length !== localFlow.jettonTransfers.length) {
    console.log(
      'Wrong toncenter money flow jetton transfers',
      toncenterFlow.jettonTransfers,
      localFlow.jettonTransfers
    )
    return { isValid: false, error: 'Wrong toncenter money flow jetton transfers count' }
  }

  for (const t of toncenterFlow.jettonTransfers) {
    const jettonTransfer = localFlow.jettonTransfers.find(
      (j) => t.jetton && j.jetton?.equals(t.jetton) && j.from?.equals(t.from) && j.to?.equals(t.to)
    )

    if (!jettonTransfer) {
      return {
        isValid: false,
        error: `Wrong toncenter money flow jetton transfers exist: ${t.jetton} ${t.from} ${t.to}`,
      }
    }

    if (jettonTransfer.amount !== t.amount) {
      return {
        isValid: false,
        error: `Wrong toncenter money flow jetton transfers amount: ${t.jetton} ${t.from} ${t.to} ${jettonTransfer.amount} ${t.amount}`,
      }
    }
  }

  return { isValid: true, error: null }
}
