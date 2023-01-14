import { hookstate, useHookstate } from '@hookstate/core'
import { invoke } from '@tauri-apps/api'

export const tauriState = hookstate(async () => {
  const port = await invoke<string>('get_ws_port')

  return {
    port: parseInt(port, 10),
  }
})

export function useTauriState() {
  return useHookstate(tauriState)
}
