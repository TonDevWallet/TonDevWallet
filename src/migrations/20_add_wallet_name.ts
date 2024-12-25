export function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE wallets
      ADD name text;
  `)
}

export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE wallets
      DROP name;
  `)
}
