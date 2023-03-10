/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    CREATE TABLE wallets (
      id integer PRIMARY KEY,
      type text,
      key_id integer,
      subwallet_id integer,

      FOREIGN KEY(key_id) REFERENCES keys(id)
    )
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    DROP TABLE wallets;
  `)
}
