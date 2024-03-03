/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE connect_message_transactions RENAME TO connect_message_transactions_old;
    
    CREATE TABLE connect_message_transactions (
      id integer PRIMARY KEY AUTOINCREMENT,
      connect_session_id integer,
      connect_event_id integer,
      key_id integer,
      wallet_id integer,
      status integer,
      payload text,
      wallet_address text,
      created_at timestamp,
      updated_at timestamp
    );
    
    INSERT INTO connect_message_transactions (
      id,
      connect_session_id,
      connect_event_id,
      key_id,
      wallet_id,
      status,
      payload
    ) SELECT
      id,
      connect_session_id,
      connect_event_id,
      key_id,
      wallet_id,
      status,
      payload
    FROM connect_message_transactions_old;
    DROP TABLE connect_message_transactions_old;
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE connect_message_transactions RENAME TO connect_message_transactions_old;

    CREATE TABLE connect_message_transactions (
      id integer PRIMARY KEY,
      connect_session_id integer,
      connect_event_id integer,
      key_id integer,
      wallet_id integer,
      status integer,
      payload text,
    
      FOREIGN KEY(key_id) REFERENCES keys(id),
      FOREIGN KEY(wallet_id) REFERENCES wallets(id),
      FOREIGN KEY(connect_session_id) REFERENCES connect_sessions(id)
    );

    INSERT INTO connect_message_transactions(
      id,
      connect_session_id,
      connect_event_id,
      key_id,
      wallet_id,
      status,
      payload
    ) SELECT
      id,
      connect_session_id,
      connect_event_id,
      key_id,
      wallet_id,
      status,
      payload
    FROM connect_message_transactions_old;
    DROP TABLE connect_message_transactions_old;
  `)
}
