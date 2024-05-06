/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    PRAGMA foreign_keys = OFF;

    BEGIN;

    ALTER TABLE keys RENAME TO keys_old;
    
    CREATE TABLE keys (
      id integer PRIMARY KEY AUTOINCREMENT,
      encrypted text,
      public_key text UNIQUE,
      name text
    );
    
    INSERT INTO keys (
      id,
      encrypted,
      public_key,
      name
    ) SELECT
      id,
      encrypted,
      public_key,
      name
    FROM keys_old;
    DROP TABLE keys_old;

    COMMIT;

    PRAGMA foreign_keys = ON;
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    PRAGMA foreign_keys = OFF;
    BEGIN;
    ALTER TABLE keys RENAME TO keys_old;

    CREATE TABLE keys (
      id integer PRIMARY KEY,
      encrypted text,
      public_key text UNIQUE,
      name text
    );
    
    INSERT INTO keys (
      id,
      encrypted,
      public_key,
      name
    ) SELECT
      id,
      encrypted,
      public_key,
      name
    FROM keys_old;
    DROP TABLE keys_old;
    COMMIT;
    
    PRAGMA foreign_keys = ON;
  `)
}

export const config = { transaction: false }
