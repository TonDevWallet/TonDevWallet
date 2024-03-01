/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
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
    )
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    DROP TABLE networks;
  `)
}
