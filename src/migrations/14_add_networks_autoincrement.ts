/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    PRAGMA foreign_keys = OFF;

    --BEGIN;

    ALTER TABLE networks RENAME TO networks_old;
    
    CREATE TABLE networks (
      network_id integer PRIMARY KEY AUTOINCREMENT,
      name text NOT NULL,
      url text NOT NULL,
      item_order integer NOT NULL,
      is_default boolean NOT NULL,
      
      is_testnet boolean NOT NULL,
      scanner_url text,

      created_at timestamp,
      updated_at timestamp
    );
    
    INSERT INTO networks (
      network_id,
      name,
      url,
      item_order,
      is_default,
      is_testnet,
      scanner_url,
      created_at,
      updated_at
    ) SELECT
      network_id,
      name,
      url,
      item_order,
      is_default,
      is_testnet,
      scanner_url,
      created_at,
      updated_at
    FROM networks_old;
    DROP TABLE networks_old;

    --COMMIT;

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
    --BEGIN;
    ALTER TABLE networks RENAME TO networks_old;

    CREATE TABLE networks (
      network_id integer PRIMARY KEY,
      name text NOT NULL,
      url text NOT NULL,
      item_order integer NOT NULL,
      is_default boolean NOT NULL,
      
      is_testnet boolean NOT NULL,
      scanner_url text,

      created_at timestamp,
      updated_at timestamp
    );
    
    INSERT INTO networks (
      network_id,
      name,
      url,
      item_order,
      is_default,
      is_testnet,
      scanner_url,
      created_at,
      updated_at
    ) SELECT
      network_id,
      name,
      url,
      item_order,
      is_default,
      is_testnet,
      scanner_url,
      created_at,
      updated_at
    FROM networks_old;
    DROP TABLE networks_old;
    --COMMIT;
    
    PRAGMA foreign_keys = ON;
  `)
}

// export const config = { transaction: false }
