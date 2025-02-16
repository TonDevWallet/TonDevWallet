export function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE wallets
      ADD workchain_id integer;
  `)
}

export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE wallets
      DROP workchain_id;
  `)
}
