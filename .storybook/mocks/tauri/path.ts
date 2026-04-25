export enum BaseDirectory {
  AppData = 18,
  AppLocalData = 19,
  Resource = 17,
}

export async function appDataDir(): Promise<string> {
  return '/storybook/app-data'
}

export async function join(...parts: string[]): Promise<string> {
  return parts.join('/').replace(/\/+/g, '/')
}
