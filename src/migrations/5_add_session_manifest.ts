/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE connect_sessions
      ADD url text;
    ALTER TABLE connect_sessions
      ADD name text;
    ALTER TABLE connect_sessions
      ADD icon_url text;
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE connect_sessions
      DROP url;
    ALTER TABLE connect_sessions
      DROP name;
    ALTER TABLE connect_sessions
      DROP icon_url;
`)
}
