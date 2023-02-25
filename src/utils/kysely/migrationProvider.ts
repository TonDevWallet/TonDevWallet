// import { isFunction, isObject } from '../util/object-utils.js'
// import { Migration, MigrationProvider } from './migrator.js'

import { MigrationProvider, Migration } from 'kysely'
import { isFunction } from './kyselySqliteDriver'

import * as migrations from '../../migrations'

export interface FileMigrationProviderFS {
  readdir(path: string): Promise<string[]>
}

export interface FileMigrationProviderPath {
  join(...path: string[]): string
}

export interface FileMigrationProviderProps {
  fs: FileMigrationProviderFS
  path: FileMigrationProviderPath
  migrationFolder: string
}

/**
 * Reads all migrations from a folder in node.js.
 *
 * ### Examples
 *
 * ```ts
 * import { promises as fs } from 'fs'
 * import path from 'path'
 *
 * new FileMigrationProvider({
 *   fs,
 *   path,
 *   migrationFolder: 'path/to/migrations/folder'
 * })
 * ```
 */
export class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    // const migrations: Record<string, Migration> = {}
    // const files = await this.#props.fs.readdir(this.#props.migrationFolder)

    // for (const fileName of files) {
    //   if (
    //     fileName.endsWith('.js') ||
    //     (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) ||
    //     fileName.endsWith('.mjs') ||
    //     (fileName.endsWith('.mts') && !fileName.endsWith('.d.mts'))
    //   ) {
    //     const migration = await import(
    //       /* webpackIgnore: true */ this.#props.path.join(this.#props.migrationFolder, fileName)
    //     )
    //     const migrationKey = fileName.substring(0, fileName.lastIndexOf('.'))

    //     // Handle esModuleInterop export's `default` prop...
    //     if (isMigration(migration?.default)) {
    //       migrations[migrationKey] = migration.default
    //     } else if (isMigration(migration)) {
    //       migrations[migrationKey] = migration
    //     }
    //   }
    // }

    // return migrations

    return migrations
  }
}

export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}

function isMigration(obj: unknown): obj is Migration {
  return isObject(obj) && isFunction(obj.up)
}
