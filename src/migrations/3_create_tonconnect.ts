import { Kysely, sql } from 'kysely'

export async function up(kysely: Kysely<any>) {
  await sql`
    CREATE TABLE connect_sessions (
      id integer PRIMARY KEY,
      secret_key text,
      user_id text,
      key_id integer,
      wallet_id integer,
      last_event_id integer,

      FOREIGN KEY(key_id) REFERENCES keys(id),
      FOREIGN KEY(wallet_id) REFERENCES wallets(id)
    )
  `.execute(kysely)
}

export async function down(kysely: Kysely<any>) {
  await sql`
    DROP TABLE connect_sessions;
  `.execute(kysely)
}
