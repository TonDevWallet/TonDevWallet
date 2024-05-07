import { AbstractMigrationsLoader } from 'knex/lib/migrations/common/MigrationsLoader'

import * as migrations from '../migrations'

const migrationNameRegex = /^m_(\d+)_/
const migrationsKeys = Object.keys(migrations).sort((a, b) => {
  const matchedA = a.match(migrationNameRegex)
  const matchedB = b.match(migrationNameRegex)

  const aNum = matchedA ? parseInt(matchedA[1], 10) : 0
  const bNum = matchedB ? parseInt(matchedB[1], 10) : 0

  return aNum - bNum
})
const migrationsList = migrationsKeys.map((name) => ({ file: name }))

export class ImportMigrations extends AbstractMigrationsLoader {
  private maxCount = 0

  public setMaxCount(maxCount: number) {
    this.maxCount = maxCount
  }

  /**
   * Gets the migration names
   * @returns Promise<string[]>
   */
  async getMigrations() {
    // Get a list of files in all specified migration directories
    if (this.maxCount) {
      return migrationsList.slice(0, this.maxCount)
    }

    return migrationsList
  }

  static get MigrationsCount() {
    return Object.keys(migrations).length
  }

  getMigrationName(migration) {
    return migration.file
  }

  getMigration(migrationInfo) {
    return migrations[migrationInfo.file]
  }
}
