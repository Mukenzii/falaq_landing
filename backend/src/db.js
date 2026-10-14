import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const q = (text, params) => pool.query(text, params);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  slug    text PRIMARY KEY,
  name    text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  cover   text,
  sort    int  NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS books (
  id          serial PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  author      text NOT NULL DEFAULT '',
  category    text REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  news_slug   text,
  cover_url   text,
  uzum_id     bigint,
  uzum_manual boolean NOT NULL DEFAULT false,
  featured    boolean NOT NULL DEFAULT false,
  more        boolean NOT NULL DEFAULT false,
  announced   boolean NOT NULL DEFAULT false,
  sort        int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS news (
  id         serial PRIMARY KEY,
  slug       text UNIQUE NOT NULL,
  title      text NOT NULL,
  image      text,
  summary    text NOT NULL DEFAULT '',
  body       text NOT NULL DEFAULT '',
  app        boolean NOT NULL DEFAULT false,
  sort       int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS uzum_products (
  id         bigint PRIMARY KEY,
  product_id bigint NOT NULL,
  title      text NOT NULL,
  price      int,
  full_price int,
  image      text,
  images     jsonb NOT NULL DEFAULT '[]',
  rating     real,
  reviews    int,
  in_stock   boolean NOT NULL DEFAULT false,
  delivery   text,
  category   text,
  url        text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sync_runs (
  id          serial PRIMARY KEY,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text NOT NULL DEFAULT 'running',
  source      text,
  found       int,
  matched     int,
  log         text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS messages (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  phone      text NOT NULL,
  kind       text NOT NULL DEFAULT 'savol',
  text       text NOT NULL DEFAULT '',
  handled    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

export async function migrate() {
  // Postgres may still be starting when the container comes up.
  for (let i = 0; ; i++) {
    try { await q("SELECT 1"); break; } catch (e) {
      if (i > 30) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  await q(SCHEMA);
  await q("ALTER TABLE books ADD COLUMN IF NOT EXISTS uzum_manual boolean NOT NULL DEFAULT false");
  await q("ALTER TABLE uzum_products ADD COLUMN IF NOT EXISTS category text");
}
