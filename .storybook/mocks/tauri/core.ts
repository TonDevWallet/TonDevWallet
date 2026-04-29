export async function invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
  console.debug('[storybook tauri.invoke]', command, args)

  const responses: Record<string, unknown> = {
    get_os_name: 'storybook',
    detect_qr_code: [],
    detect_qr_code_from_image: [],
  }

  return (responses[command] ?? null) as T
}
