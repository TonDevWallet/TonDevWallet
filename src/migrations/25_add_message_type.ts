/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(
    `
        ALTER TABLE connect_message_transactions
        ADD COLUMN message_type text;
        UPDATE connect_message_transactions
        SET message_type = 'tx'
        WHERE message_type IS NULL OR message_type = '';
    `
  )
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE connect_message_transactions
    DROP COLUMN message_type;
  `)
}
