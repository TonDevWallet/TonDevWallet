import Database from 'tauri-plugin-sql-api'
import { Knex } from 'knex'

import sqliteDialect from 'knex/lib/dialects/sqlite3'

class clientSqliteWasm extends sqliteDialect {
  // connectionSettings: Knex.Sqlite3ConnectionConfig
  driver: typeof Database = Database

  _driver() {
    return Database
  }

  // Get a raw connection from the database, returning a promise with the connection object.
  async acquireRawConnection() {
    // const flags = this.connectionSettings.flags || 'ct'
    // console.log('connectionSettings', this.connectionSettings.flags)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.driver.load(this.connectionSettings.filename)
  }

  // Used to explicitly close a connection, called internally by the pool when
  // a connection times out or the pool is shutdown.
  async destroyRawConnection() {
    // return connection.close()
  }

  // Runs the query on the specified connection, providing the bindings and any
  // other necessary prep work.
  async _query(connection: Database, obj) {
    if (!obj.sql) throw new Error('The query is empty')

    if (!connection) {
      throw new Error('No connection provided')
    }

    const bindings = this._formatBindings(obj.bindings)

    let callMethod: 'all' | 'run'
    switch (obj.method) {
      case 'insert':
      case 'update':
        callMethod = obj.returning ? 'all' : 'run'
        break
      case 'counter':
      case 'del':
        callMethod = 'run'
        break
      default:
        callMethod = 'all'
    }

    if (callMethod === 'all') {
      const res = await connection.select(obj.sql, bindings)

      obj.response = res
      obj.context = {} // TODO what should be here?
    } else {
      const res = await connection.execute(obj.sql, bindings)
      obj.response = res
      obj.context = {
        lastID: res.lastInsertId,
        changes: res.rowsAffected,
      }
    }

    return obj
  }

  _formatBindings(bindings) {
    if (!bindings) {
      return []
    }
    return bindings.map((binding) => {
      if (binding instanceof Date) {
        return binding.valueOf()
      }

      if (typeof binding === 'boolean') {
        return Number(binding)
      }

      return binding
    })
  }
}

export const ClientSqliteWasm = clientSqliteWasm as unknown as typeof Knex.Client
