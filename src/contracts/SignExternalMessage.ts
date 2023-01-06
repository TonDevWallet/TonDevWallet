import { ExternalMessage, Cell, CommonMessageInfo, CellMessage, InternalMessage } from 'ton'
import { sign } from 'ton-crypto'

export function SignExternalMessage(key: Buffer, message: ExternalMessage): ExternalMessage {
  if (!message.body.body) {
    return message
  }
  const msgCell = new Cell()
  message.body.body.writeTo(msgCell)

  const signature = sign(msgCell.hash(), key)

  const bodyCell = new Cell()
  bodyCell.bits.writeBuffer(signature)
  message.body.body.writeTo(bodyCell)

  return new ExternalMessage({
    ...message,
    body: new CommonMessageInfo({
      ...message.body,

      body: new CellMessage(bodyCell),
    }),
  })
}

export function SignInternalMessage(key: Buffer, message: InternalMessage): InternalMessage {
  if (!message.body.body) {
    return message
  }

  const msgCell = new Cell()
  message.body.body.writeTo(msgCell)

  const signature = sign(msgCell.hash(), key)

  const bodyCell = new Cell()
  bodyCell.bits.writeBuffer(signature)
  message.body.body.writeTo(bodyCell)

  return new InternalMessage({
    // ...message,

    to: message.to,
    value: message.value,
    bounce: message.bounce,
    ihrFees: message.ihrFees,
    fwdFees: message.fwdFees,
    createdLt: message.createdLt,
    createdAt: message.createdAt ? message.createdAt.toNumber() : null,
    ihrDisabled: message.ihrDisabled,
    bounced: message.bounced,
    from: message.from,
    // body: message.body,

    body: new CommonMessageInfo({
      ...message.body,
      body: new CellMessage(bodyCell),
    }),
    // ...message,
    // body: new CommonMessageInfo({
    //   ...message.body,
    //   body: new CellMessage(bodyCell),
    // }),
  })
}
