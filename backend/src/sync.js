// "Uzumdan yangilash": scrape the Uzum shop, store every product, and link books to products.
// One sync at a time; progress is written to sync_runs so the admin page can poll it.

import { pool, q } from "./db.js";
import { scrapeUzum, normalize } from "./uzum-scraper.js";
import { DEFAULT_UZUM } from "./seed.js";

let running = null;

export const isRunning = () => running !== null;

export async function startSync() {
  if (running) return { id: running, alreadyRunning: true };
  const { rows } = await q("INSERT INTO sync_runs DEFAULT VALUES RETURNING id");
  const id = rows[0].id;
  running = id;
  run(id).finally(() => { running = null; });
  return { id, alreadyRunning: false };
}

async function run(id) {
  const lines = [];
  const log = (s) => {
    lines.push(`${new Date().toISOString().slice(11, 19)}  ${s}`);
    q("UPDATE sync_runs SET log = $2 WHERE id = $1", [id, lines.join("\n")]).catch(() => {});
  };
  try {
    const { rows } = await q("SELECT value FROM settings WHERE key = 'uzum'");
    const cfg = { ...DEFAULT_UZUM, ...(rows[0]?.value || {}) };
    const { shop, source, products } = await scrapeUzum({ ...cfg, log });

    const c = await pool.connect();
    let matched = 0;
    try {
      await c.query("BEGIN");
      for (const p of products) {
        await c.query(
          `INSERT INTO uzum_products (id, product_id, title, price, full_price, image, images, rating, reviews, in_stock, delivery, url, active, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,now())
           ON CONFLICT (id) DO UPDATE SET product_id=$2, title=$3, price=$4, full_price=$5, image=$6, images=$7,
             rating=$8, reviews=$9, in_stock=$10, delivery=$11, url=$12, active=true, updated_at=now()`,
          [p.id, p.productId, p.title, p.price, p.fullPrice, p.image, JSON.stringify(p.images), p.rating, p.reviews,
            p.inStock, p.delivery, p.url],
        );
      }
      // Products that disappeared from Uzum stay in the table (books may link to them) but are hidden.
      const gone = await c.query(
        "UPDATE uzum_products SET active = false, in_stock = false WHERE NOT (id = ANY($1::bigint[])) AND active RETURNING id",
        [products.map((p) => p.id)],
      );
      if (gone.rowCount) log(`${gone.rowCount} ta mahsulot Uzumda endi yo‘q — yashirildi.`);

      matched = await linkBooks(c, products, log);
      await c.query(
        "INSERT INTO settings (key, value) VALUES ('uzum_shop', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [JSON.stringify({ ...shop, source, syncedAt: new Date().toISOString() })],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }

    log(`Tayyor: ${products.length} ta mahsulot saqlandi, ${matched} ta kitob bog‘landi.`);
    await q(
      "UPDATE sync_runs SET status='ok', source=$2, found=$3, matched=$4, finished_at=now(), log=$5 WHERE id=$1",
      [id, source, products.length, matched, lines.join("\n")],
    );
  } catch (e) {
    log(`Xato: ${e.message}`);
    console.error("sync failed:", e);
    await q("UPDATE sync_runs SET status='error', finished_at=now(), log=$2 WHERE id=$1", [id, lines.join("\n")]);
  }
}

// A book keeps a product picked by hand in the admin panel while it is still on Uzum. Otherwise
// it gets a product whose title contains the book title as whole words and names no other book
// before it (so "Yusufning qizi (Fotimaning bolasi-2)" goes to Yusufning qizi only), preferring
// the title near the start, no part II etc. after it, in stock, then most reviews.
async function linkBooks(c, products, log) {
  const { rows: books } = await c.query("SELECT id, title, uzum_id, uzum_manual FROM books ORDER BY sort, id");
  const live = new Set(products.map((p) => p.id));
  const names = books.map((b) => normalize(b.title)).filter(Boolean);
  let matched = 0;
  for (const b of books) {
    if (b.uzum_manual && b.uzum_id && live.has(Number(b.uzum_id))) { matched++; continue; }
    const n = normalize(b.title);
    const hits = products
      .map((p) => {
        const t = ` ${normalize(p.title)} `;
        const at = t.indexOf(` ${n} `);
        const others = names.filter((o) => !n.includes(o)).map((o) => t.indexOf(` ${o} `)).filter((i) => i >= 0);
        return { p, at, before: others.some((i) => i < at), after: others.length };
      })
      .filter((h) => n && h.at >= 0 && !h.before)
      .sort((a, z) => a.after - z.after || a.at - z.at
        || Number(z.p.inStock) - Number(a.p.inStock) || (z.p.reviews || 0) - (a.p.reviews || 0))
      .map((h) => h.p);
    const pick = hits[0]?.id ?? null;
    if (pick) matched++;
    if (String(pick) !== String(b.uzum_id)) {
      await c.query("UPDATE books SET uzum_id = $2 WHERE id = $1", [b.id, pick]);
      log(pick ? `“${b.title}” → ${hits[0].title} (${hits[0].price} so‘m)` : `“${b.title}” uchun mahsulot topilmadi.`);
    }
  }
  return matched;
}
