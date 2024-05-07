/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    PRAGMA foreign_keys = OFF;

    BEGIN;

    ALTER TABLE last_selected_wallets RENAME TO last_selected_wallets_old;
    
    CREATE TABLE last_selected_wallets (
      url text PRIMARY KEY,
      key_id integer,
      wallet_id integer,

      FOREIGN KEY(key_id) REFERENCES "keys"(id),
      FOREIGN KEY(wallet_id) REFERENCES "wallets"(id)
    );
    
    INSERT INTO last_selected_wallets (
      url,
      key_id,
      wallet_id
    ) SELECT
      url,
      key_id,
      wallet_id
    FROM last_selected_wallets_old;
    DROP TABLE last_selected_wallets_old;

    COMMIT;

    PRAGMA foreign_keys = ON;
  `)
}

/*
CREATE TABLE last_selected_wallets (
      url text PRIMARY KEY,
      key_id integer,
      wallet_id integer,

      FOREIGN KEY(key_id) REFERENCES "keys_old"(id),
      FOREIGN KEY(wallet_id) REFERENCES "wallets_old"(id)
    )
*/
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    PRAGMA foreign_keys = OFF;

    BEGIN;

    ALTER TABLE last_selected_wallets RENAME TO last_selected_wallets_old;
    
    CREATE TABLE last_selected_wallets (
      url text PRIMARY KEY,
      key_id integer,
      wallet_id integer,

      FOREIGN KEY(key_id) REFERENCES "keys"(id),
      FOREIGN KEY(wallet_id) REFERENCES "wallets"(id)
    );
    
    INSERT INTO last_selected_wallets (
      url,
      key_id,
      wallet_id
    ) SELECT
      url,
      key_id,
      wallet_id
    FROM last_selected_wallets_old;
    DROP TABLE last_selected_wallets_old;

    COMMIT;

    PRAGMA foreign_keys = ON;
  `)
}

export const config = { transaction: false }
