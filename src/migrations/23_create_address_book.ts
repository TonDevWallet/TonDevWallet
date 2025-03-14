/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    CREATE TABLE address_book (
      address_book_id integer PRIMARY KEY AUTOINCREMENT,
      network_id integer NOT NULL,
      address text NOT NULL,
      title text NOT NULL,
      description text,
      created_at integer NOT NULL
    );
    
    CREATE INDEX idx_address_book_network_id ON address_book(network_id);
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    DROP TABLE address_book;
  `)
}
