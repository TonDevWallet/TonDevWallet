import { AbstractMigrationsLoader } from 'knex/lib/migrations/common/MigrationsLoader'

import * as migrations from '../migrations'

export class ImportMigrations extends AbstractMigrationsLoader {
  /**
   * Gets the migration names
   * @returns Promise<string[]>
   */
  async getMigrations() {
    // Get a list of files in all specified migration directories
    return Object.keys(migrations).map((name) => ({ file: name }))
  }

  getMigrationName(migration) {
    return migration.file
  }

  getMigration(migrationInfo) {
    return migrations[migrationInfo.file]
  }
}
