/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    PRAGMA foreign_keys = OFF;

    BEGIN;
    
    -- Add a new column with the desired type
    ALTER TABLE wallets ADD COLUMN new_subwallet_id text;

    -- Copy data from the old column to the new one
    UPDATE wallets SET new_subwallet_id = CAST(subwallet_id AS text);

    -- Drop the old column
    ALTER TABLE wallets DROP COLUMN subwallet_id;

    -- Rename the new column to the original name
    ALTER TABLE wallets RENAME COLUMN new_subwallet_id TO subwallet_id;

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

    -- Add a new column with the original type
    ALTER TABLE wallets ADD COLUMN new_subwallet_id integer;

    -- Copy data from the text column to the integer one
    UPDATE wallets SET new_subwallet_id = CAST(subwallet_id AS integer);

    -- Drop the text column
    ALTER TABLE wallets DROP COLUMN subwallet_id;

    -- Rename the new column to the original name
    ALTER TABLE wallets RENAME COLUMN new_subwallet_id TO subwallet_id;

    COMMIT;
    
    PRAGMA foreign_keys = ON;
  `)
}

export const config = { transaction: false }
