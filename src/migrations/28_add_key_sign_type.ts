export function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE keys
      ADD sign_type text DEFAULT 'ton';
  `)
}

export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE keys
      DROP sign_type;
  `)
}
