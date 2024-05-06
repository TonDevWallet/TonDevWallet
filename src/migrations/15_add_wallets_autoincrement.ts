/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    PRAGMA foreign_keys = OFF;

    BEGIN;

    ALTER TABLE wallets RENAME TO wallets_old;
    
    CREATE TABLE wallets (
      id integer PRIMARY KEY AUTOINCREMENT,
      type text,
      key_id integer,
      subwallet_id integer, wallet_address text,

      FOREIGN KEY(key_id) REFERENCES "keys"(id)
    );
    
    INSERT INTO wallets (
      id,
      type,
      key_id,
      subwallet_id
    ) SELECT
      id,
      type,
      key_id,
      subwallet_id
    FROM wallets_old;
    DROP TABLE wallets_old;

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
    ALTER TABLE wallets RENAME TO wallets_old;

    CREATE TABLE wallets (
      id integer PRIMARY KEY,
      type text,
      key_id integer,
      subwallet_id integer, wallet_address text,

      FOREIGN KEY(key_id) REFERENCES "keys"(id)
    );
    
    INSERT INTO wallets (
      id,
      type,
      key_id,
      subwallet_id
    ) SELECT
      id,
      type,
      key_id,
      subwallet_id
    FROM wallets_old;
    DROP TABLE wallets_old;
    COMMIT;
    
    PRAGMA foreign_keys = ON;
  `)
}

export const config = { transaction: false }
