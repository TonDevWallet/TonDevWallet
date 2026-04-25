export async function onOpenUrl(handler: (urls: string[]) => void): Promise<() => void> {
  console.debug('[storybook tauri.onOpenUrl]', handler)
  return () => undefined
}
