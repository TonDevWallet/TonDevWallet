type EventPayload<T> = { payload: T }

class MockWebviewWindow {
  label: string

  constructor(label = 'storybook') {
    this.label = label
  }

  async theme(): Promise<'light' | 'dark'> {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }

  async onThemeChanged(handler: (event: EventPayload<'light' | 'dark'>) => void): Promise<() => void> {
    console.debug('[storybook tauri.onThemeChanged]', handler)
    return () => undefined
  }

  async listen<T = unknown>(event: string, handler: (event: EventPayload<T>) => void): Promise<() => void> {
    console.debug('[storybook tauri.webview.listen]', event, handler)
    return () => undefined
  }

  async emit(event: string, payload?: unknown): Promise<void> {
    console.debug('[storybook tauri.webview.emit]', event, payload)
  }

  async show(): Promise<void> {}
  async hide(): Promise<void> {}
  async close(): Promise<void> {}
  async setFocus(): Promise<void> {}
  async setTitle(): Promise<void> {}
}

export class WebviewWindow extends MockWebviewWindow {}
export const appWindow = new MockWebviewWindow()
export const getCurrentWebviewWindow = () => appWindow
