/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    CREATE TABLE connect_sessions (
      id integer PRIMARY KEY,
      secret_key text,
      user_id text,
      key_id integer,
      wallet_id integer,
      last_event_id integer,

      FOREIGN KEY(key_id) REFERENCES keys(id),
      FOREIGN KEY(wallet_id) REFERENCES wallets(id)
    )
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    DROP TABLE connect_sessions;
  `)
}
