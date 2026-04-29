export default class Database {
  static async load(): Promise<Database> {
    return new Database()
  }

  async execute(): Promise<{ rowsAffected: number }> {
    return { rowsAffected: 0 }
  }

  async select<T = unknown[]>(): Promise<T> {
    return [] as T
  }

  async close(): Promise<void> {}
}
