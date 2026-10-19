// First-run content: the books, news and links the static site shipped with (seed/data.js).
// Content is inserted only when the database has no books yet, so edits made in the admin panel
// are never lost; link fields added later are filled in without touching existing ones.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { pool, q } from "./db.js";

export const DEFAULT_UZUM = { shop: "falaqnashr", fallbackQuery: "falaq nashr", fallbackMatch: "falaq" };

function loadSeed() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(fileURLToPath(new URL("../seed/data.js", import.meta.url)), "utf8"), sandbox);
  return sandbox.window.FALAQ;
}

export async function seed() {
  const D = loadSeed();
  // Link fields added in later versions get their seed value; links edited in the admin stay as they are.
  await q("UPDATE settings SET value = $1::jsonb || value WHERE key = 'links'", [JSON.stringify(D.links)]);

  const { rows } = await q("SELECT count(*)::int AS n FROM books");
  if (rows[0].n > 0) return false;

  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING", ["links", JSON.stringify(D.links)]);
    await c.query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING", ["phones", JSON.stringify(D.phones)]);
    await c.query("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING", ["uzum", JSON.stringify(DEFAULT_UZUM)]);
    for (const [i, x] of D.categories.entries()) {
      await c.query(
        "INSERT INTO categories (slug, name, tagline, cover, sort) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [x.slug, x.name, x.tagline, x.cover, i],
      );
    }
    for (const [i, b] of D.books.entries()) {
      await c.query(
        `INSERT INTO books (slug, title, author, category, description, news_slug, cover_url, featured, more, announced, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [b.slug, b.title, b.author, b.category, b.desc, b.news || null, `assets/books/${b.slug}.jpg`,
          !!b.featured, !!b.more, !!b.announced, i],
      );
    }
    for (const [i, n] of D.news.entries()) {
      await c.query(
        "INSERT INTO news (slug, title, image, summary, body, app, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [n.slug, n.title, `assets/news/${n.image}`, n.summary, n.body, !!n.app, i],
      );
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  return true;
}
