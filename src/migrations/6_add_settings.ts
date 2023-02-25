import { Kysely, sql } from 'kysely'

export async function up(kysely: Kysely<any>) {
  await sql`
    CREATE TABLE settings (
      name text PRIMARY KEY,
      value text
    )
  `.execute(kysely)
}

export async function down(kysely: Kysely<any>) {
  await sql`
    DROP TABLE settings;
  `.execute(kysely)
}
