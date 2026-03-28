import { neon } from "@neondatabase/serverless";

let schemaReady = false;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  return neon(databaseUrl);
}

export async function ensureDatabaseSchema() {
  if (schemaReady) {
    return;
  }

  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      unsubscribe_token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_sends (
      id BIGSERIAL PRIMARY KEY,
      post_slug TEXT NOT NULL UNIQUE,
      post_title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      subscriber_count INTEGER NOT NULL DEFAULT 0,
      delivered_count INTEGER NOT NULL DEFAULT 0,
      attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      error TEXT
    )
  `;

  schemaReady = true;
}

export async function runQuery<T>(strings: TemplateStringsArray, ...values: unknown[]) {
  const sql = getSql();
  return sql(strings, ...values) as Promise<T[]>;
}
