import { Kysely, sql } from 'kysely'

export async function up(kysely: Kysely<any>) {
  await sql`
    CREATE TABLE keys (
      id integer PRIMARY KEY,
      encrypted text,
      public_key text UNIQUE,
      name text
    )
  `.execute(kysely)
}

export async function down(kysely: Kysely<any>) {
  await sql`
    DROP TABLE keys;
  `.execute(kysely)
}
