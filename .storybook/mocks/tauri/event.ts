export type Event<T = unknown> = { event: string; id: number; payload: T }
export type UnlistenFn = () => void
export type EventCallback<T = unknown> = (event: Event<T>) => void

export async function listen<T = unknown>(
  event: string,
  handler: EventCallback<T>
): Promise<UnlistenFn> {
  console.debug('[storybook tauri.listen]', event, handler)
  return () => undefined
}

export async function emit(event: string, payload?: unknown): Promise<void> {
  console.debug('[storybook tauri.emit]', event, payload)
}
