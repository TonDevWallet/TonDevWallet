/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    CREATE TABLE last_selected_wallets (
      url text PRIMARY KEY,
      key_id integer,
      wallet_id integer,

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
    DROP TABLE last_selected_wallets;
  `)
}
