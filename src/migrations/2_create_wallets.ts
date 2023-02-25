import { Kysely, sql } from 'kysely'

export async function up(kysely: Kysely<any>) {
  await sql`
    CREATE TABLE wallets (
      id integer PRIMARY KEY,
      type text,
      key_id integer,
      subwallet_id integer,

      FOREIGN KEY(key_id) REFERENCES keys(id)
    )
    `.execute(kysely)
}

export async function down(kysely: Kysely<any>) {
  await sql`
    DROP TABLE wallets;
    `.execute(kysely)
}
