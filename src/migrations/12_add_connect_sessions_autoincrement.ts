/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.raw(`
    ALTER TABLE connect_sessions RENAME TO connect_sessions_old;
    
    CREATE TABLE connect_sessions (
      id integer PRIMARY KEY AUTOINCREMENT,
      secret_key text,
      user_id text,
      key_id integer,
      wallet_id integer,
      last_event_id integer,
      url text,
      name text,
      icon_url text,
      auto_send boolean DEFAULT false NOT NULL,

      FOREIGN KEY(key_id) REFERENCES keys(id),
      FOREIGN KEY(wallet_id) REFERENCES wallets(id)
    );
    
    INSERT INTO connect_sessions (
      id,
      secret_key,
      user_id,
      key_id,
      wallet_id,
      last_event_id,
      url,
      name,
      icon_url,
      auto_send
    ) SELECT
      id,
      secret_key,
      user_id,
      key_id,
      wallet_id,
      last_event_id,
      url,
      name,
      icon_url,
      auto_send
    FROM connect_sessions_old;
    DROP TABLE connect_sessions_old;
  `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(`
    ALTER TABLE connect_sessions RENAME TO connect_sessions_old;

    CREATE TABLE connect_sessions (
      id integer PRIMARY KEY,
      secret_key text,
      user_id text,
      key_id integer,
      wallet_id integer,
      last_event_id integer,
      url text,
      name text,
      icon_url text,
      auto_send boolean DEFAULT false NOT NULL,

      FOREIGN KEY(key_id) REFERENCES keys(id),
      FOREIGN KEY(wallet_id) REFERENCES wallets(id)
    )

    INSERT INTO connect_sessions (
      id,
      secret_key,
      user_id,
      key_id,
      wallet_id,
      last_event_id,
      url,
      name,
      icon_url,
      auto_send
    ) SELECT
      id,
      secret_key,
      user_id,
      key_id,
      wallet_id,
      last_event_id,
      url,
      name,
      icon_url,
      auto_send
    FROM connect_sessions_old;
    DROP TABLE connect_sessions_old;
  `)
}
