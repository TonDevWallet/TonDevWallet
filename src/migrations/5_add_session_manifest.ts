import { Kysely, sql } from 'kysely'

export async function up(kysely: Kysely<any>) {
  await sql`
    ALTER TABLE connect_sessions
      ADD url text;
    ALTER TABLE connect_sessions
      ADD name text;
    ALTER TABLE connect_sessions
      ADD icon_url text;
  `.execute(kysely)
}

export async function down(kysely: Kysely<any>) {
  await sql`
    ALTER TABLE connect_sessions
      DROP url;
    ALTER TABLE connect_sessions
      DROP name;
    ALTER TABLE connect_sessions
      DROP icon_url;
  `.execute(kysely)
}
