import * as Comlink from 'comlink'
import { Buffer } from 'buffer'

self.Buffer = Buffer
self.window = self

const { ExecutorWorker } = await import('./ExecutorWorker')

const instance = new ExecutorWorker()
Comlink.expose(instance)

export type RunCommonType = typeof instance
