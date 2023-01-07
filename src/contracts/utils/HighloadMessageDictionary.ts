import {
  DictionaryValue,
  MessageRelaxed,
  storeMessageRelaxed,
  loadMessageRelaxed,
  SendMode,
  beginCell,
} from 'ton-core'

export const HighloadDictionaryMessageValue: DictionaryValue<{
  sendMode: SendMode
  message: MessageRelaxed
}> = {
  serialize(src, builder) {
    builder.storeUint(src.sendMode, 8)
    builder.storeRef(beginCell().store(storeMessageRelaxed(src.message)))
  },
  parse(src) {
    const sendMode = src.loadUint(8)
    const message = loadMessageRelaxed(src.loadRef().beginParse())
    return { sendMode, message }
  },
}
