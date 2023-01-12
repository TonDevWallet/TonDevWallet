/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    CREATE TABLE connect_message_transactions (
      id integer PRIMARY KEY,
      connect_session_id integer,
      connect_event_id integer,
      key_id integer,
      wallet_id integer,
      status integer,
      payload text
    )
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    DROP TABLE connect_message_transactions;
  `)
}
