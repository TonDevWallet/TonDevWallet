import { TLBRuntimeError } from './TLBRuntime'

export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

export interface Err<E = Error> {
  readonly ok: false
  readonly error: E
}

export type Result<T, E = Error> = Ok<T> | Err<E>

export function unwrap<T, E = Error>(res: Result<T, E>): T {
  if (res.ok) {
    return res.value
  }
  throw res.error instanceof Error ? res.error : new TLBRuntimeError(String(res.error))
}
