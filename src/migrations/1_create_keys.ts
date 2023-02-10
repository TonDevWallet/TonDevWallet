/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    CREATE TABLE keys (
      id integer PRIMARY KEY,
      encrypted text,
      public_key text UNIQUE,
      name text
    )
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    DROP TABLE keys;
  `)
}
