import { Kysely, sql } from 'kysely'

export async function up(kysely: Kysely<any>) {
  await sql`
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
    )
  `.execute(kysely)
}

export async function down(kysely: Kysely<any>) {
  await sql`
    DROP TABLE connect_message_transactions;
  `.execute(kysely)
}
