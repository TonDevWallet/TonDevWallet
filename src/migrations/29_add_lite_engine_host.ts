/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE networks
    ADD COLUMN lite_engine_host_mode text DEFAULT 'auto';
    
    ALTER TABLE networks
    ADD COLUMN lite_engine_host_custom text;
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE networks
    DROP COLUMN lite_engine_host_custom;
    
    ALTER TABLE networks
    DROP COLUMN lite_engine_host_mode;
  `)
}
