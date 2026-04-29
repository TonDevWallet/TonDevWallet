export async function exists(): Promise<boolean> {
  return false
}

export async function mkdir(): Promise<void> {}
export async function remove(): Promise<void> {}
export async function writeTextFile(): Promise<void> {}
export async function readTextFile(): Promise<string> {
  return ''
}
