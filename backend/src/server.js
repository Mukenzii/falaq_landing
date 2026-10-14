import express from "express";
import { q, migrate } from "./db.js";
import { seed } from "./seed.js";
import { startSync, isRunning } from "./sync.js";
import { checkPassword, setSession, clearSession, isAdmin, requireAdmin } from "./auth.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "200kb" }));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const setting = async (key, fallback = null) =>
  (await q("SELECT value FROM settings WHERE key = $1", [key])).rows[0]?.value ?? fallback;

/* ---------- shapes sent to the site ---------- */
const productOut = (p) => p && {
  id: Number(p.id), productId: Number(p.product_id), title: p.title, price: p.price, fullPrice: p.full_price,
  image: p.image, images: p.images, rating: p.rating, reviews: p.reviews, inStock: p.in_stock,
  delivery: p.delivery, url: p.url, category: p.category, active: p.active, updatedAt: p.updated_at,
};
const bookOut = (b) => ({
  id: b.id, slug: b.slug, title: b.title, author: b.author, category: b.category, desc: b.description,
  news: b.news_slug, cover: b.cover_url, uzumId: b.uzum_manual && b.uzum_id ? Number(b.uzum_id) : null,
  featured: b.featured, more: b.more, announced: b.announced, sort: b.sort,
  uzum: b.p_id ? productOut({
    id: b.p_id, product_id: b.p_product_id, title: b.p_title, price: b.p_price, full_price: b.p_full_price,
    image: b.p_image, images: b.p_images, rating: b.p_rating, reviews: b.p_reviews, in_stock: b.p_in_stock,
    delivery: b.p_delivery, url: b.p_url, active: b.p_active, updated_at: b.p_updated_at,
  }) : null,
});
const BOOKS_SQL = `
  SELECT b.*, p.id p_id, p.product_id p_product_id, p.title p_title, p.price p_price, p.full_price p_full_price,
         p.image p_image, p.images p_images, p.rating p_rating, p.reviews p_reviews, p.in_stock p_in_stock,
         p.delivery p_delivery, p.url p_url, p.active p_active, p.updated_at p_updated_at
  FROM books b LEFT JOIN uzum_products p ON p.id = b.uzum_id
  ORDER BY b.sort, b.id`;
const newsOut = (n) => ({ id: n.id, slug: n.slug, title: n.title, image: n.image, summary: n.summary, body: n.body, app: n.app, sort: n.sort });

/* ---------- public API ---------- */
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/site", wrap(async (req, res) => {
  const [links, phones, shop, cats, books, news] = await Promise.all([
    setting("links", {}), setting("phones", []), setting("uzum_shop"),
    q("SELECT slug, name, tagline, cover FROM categories ORDER BY sort, slug"),
    q(BOOKS_SQL),
    q("SELECT * FROM news ORDER BY sort, id"),
  ]);
  res.json({ links, phones, shop, categories: cats.rows, books: books.rows.map(bookOut), news: news.rows.map(newsOut) });
}));

app.get("/api/products", wrap(async (req, res) => {
  const { rows } = await q("SELECT * FROM uzum_products WHERE active ORDER BY in_stock DESC, reviews DESC NULLS LAST, title");
  res.json({ shop: await setting("uzum_shop"), products: rows.map(productOut) });
}));

// Contact / wholesale requests. A small per-IP limit keeps the table free of junk.
const recent = new Map();
app.post("/api/messages", wrap(async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const phone = String(req.body?.phone || "").trim().slice(0, 40);
  const text = String(req.body?.text || "").trim().slice(0, 2000);
  const kind = ["ulgurji", "savol", "hamkorlik"].includes(req.body?.kind) ? req.body.kind : "savol";
  if (req.body?.website) return res.json({ ok: true }); // honeypot field
  if (name.length < 2) return res.status(400).json({ error: "Ismingizni kiriting" });
  if (phone.replace(/\D/g, "").length < 7) return res.status(400).json({ error: "Telefon raqamini to‘g‘ri kiriting" });

  const now = Date.now();
  const hits = (recent.get(req.ip) || []).filter((t) => now - t < 10 * 60_000);
  if (hits.length >= 5) return res.status(429).json({ error: "Juda ko‘p so‘rov. Birozdan so‘ng urinib ko‘ring." });
  recent.set(req.ip, [...hits, now]);

  await q("INSERT INTO messages (name, phone, kind, text) VALUES ($1,$2,$3,$4)", [name, phone, kind, text]);
  res.status(201).json({ ok: true });
}));

/* ---------- admin: session ---------- */
app.post("/api/admin/login", (req, res) => {
  if (!checkPassword(req.body?.password)) return res.status(401).json({ error: "Parol noto‘g‘ri" });
  setSession(res);
  res.json({ ok: true });
});
app.post("/api/admin/logout", (req, res) => { clearSession(res); res.json({ ok: true }); });
app.get("/api/admin/me", (req, res) => res.json({ admin: isAdmin(req) }));

app.use("/api/admin", requireAdmin);

/* ---------- admin: Uzum sync ---------- */
app.post("/api/admin/sync", wrap(async (req, res) => res.status(202).json(await startSync())));

app.get("/api/admin/sync", wrap(async (req, res) => {
  const { rows } = await q("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 10");
  res.json({ running: isRunning(), runs: rows, shop: await setting("uzum_shop") });
}));

app.get("/api/admin/products", wrap(async (req, res) => {
  const { rows } = await q("SELECT * FROM uzum_products ORDER BY active DESC, in_stock DESC, reviews DESC NULLS LAST, title");
  res.json(rows.map(productOut));
}));

/* ---------- admin: books ---------- */
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function bookIn(body) {
  const b = body || {};
  const out = {
    slug: String(b.slug || "").trim(), title: String(b.title || "").trim(), author: String(b.author || "").trim(),
    category: b.category || null, description: String(b.desc || ""), news_slug: b.news || null,
    cover_url: b.cover || null, uzum_id: b.uzumId ? Number(b.uzumId) : null, uzum_manual: !!b.uzumId,
    featured: !!b.featured, more: !!b.more, announced: !!b.announced, sort: Number(b.sort) || 0,
  };
  if (!slugRe.test(out.slug)) throw badRequest("Slug faqat kichik lotin harflari, raqam va '-' dan iborat bo‘lsin");
  if (!out.title) throw badRequest("Kitob nomi bo‘sh");
  return out;
}
const BOOK_COLS = ["slug", "title", "author", "category", "description", "news_slug", "cover_url", "uzum_id", "uzum_manual", "featured", "more", "announced", "sort"];

app.get("/api/admin/books", wrap(async (req, res) => res.json((await q(BOOKS_SQL)).rows.map(bookOut))));

app.post("/api/admin/books", wrap(async (req, res) => {
  const b = bookIn(req.body);
  const { rows } = await q(
    `INSERT INTO books (${BOOK_COLS.join(",")}) VALUES (${BOOK_COLS.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING id`,
    BOOK_COLS.map((k) => b[k]),
  );
  res.status(201).json({ id: rows[0].id });
}));

app.put("/api/admin/books/:id", wrap(async (req, res) => {
  const b = bookIn(req.body);
  const { rowCount } = await q(
    `UPDATE books SET ${BOOK_COLS.map((k, i) => `${k} = $${i + 2}`).join(", ")} WHERE id = $1`,
    [req.params.id, ...BOOK_COLS.map((k) => b[k])],
  );
  if (!rowCount) return res.status(404).json({ error: "Topilmadi" });
  res.json({ ok: true });
}));

app.delete("/api/admin/books/:id", wrap(async (req, res) => {
  await q("DELETE FROM books WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

/* ---------- admin: news ---------- */
const NEWS_COLS = ["slug", "title", "image", "summary", "body", "app", "sort"];
function newsIn(body) {
  const n = body || {};
  const out = {
    slug: String(n.slug || "").trim(), title: String(n.title || "").trim(), image: n.image || null,
    summary: String(n.summary || ""), body: String(n.body || ""), app: !!n.app, sort: Number(n.sort) || 0,
  };
  if (!slugRe.test(out.slug)) throw badRequest("Slug faqat kichik lotin harflari, raqam va '-' dan iborat bo‘lsin");
  if (!out.title) throw badRequest("Sarlavha bo‘sh");
  return out;
}

app.get("/api/admin/news", wrap(async (req, res) => res.json((await q("SELECT * FROM news ORDER BY sort, id")).rows.map(newsOut))));

app.post("/api/admin/news", wrap(async (req, res) => {
  const n = newsIn(req.body);
  const { rows } = await q(
    `INSERT INTO news (${NEWS_COLS.join(",")}) VALUES (${NEWS_COLS.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING id`,
    NEWS_COLS.map((k) => n[k]),
  );
  res.status(201).json({ id: rows[0].id });
}));

app.put("/api/admin/news/:id", wrap(async (req, res) => {
  const n = newsIn(req.body);
  const { rowCount } = await q(
    `UPDATE news SET ${NEWS_COLS.map((k, i) => `${k} = $${i + 2}`).join(", ")} WHERE id = $1`,
    [req.params.id, ...NEWS_COLS.map((k) => n[k])],
  );
  if (!rowCount) return res.status(404).json({ error: "Topilmadi" });
  res.json({ ok: true });
}));

app.delete("/api/admin/news/:id", wrap(async (req, res) => {
  await q("DELETE FROM news WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

/* ---------- admin: messages ---------- */
app.get("/api/admin/messages", wrap(async (req, res) => {
  res.json((await q("SELECT * FROM messages ORDER BY handled, created_at DESC LIMIT 500")).rows);
}));
app.patch("/api/admin/messages/:id", wrap(async (req, res) => {
  await q("UPDATE messages SET handled = $2 WHERE id = $1", [req.params.id, !!req.body?.handled]);
  res.json({ ok: true });
}));
app.delete("/api/admin/messages/:id", wrap(async (req, res) => {
  await q("DELETE FROM messages WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
}));

/* ---------- admin: settings ---------- */
const SETTING_KEYS = ["links", "phones", "uzum"];
app.get("/api/admin/settings", wrap(async (req, res) => {
  const out = {};
  for (const k of SETTING_KEYS) out[k] = await setting(k);
  res.json(out);
}));
app.put("/api/admin/settings", wrap(async (req, res) => {
  for (const k of SETTING_KEYS) {
    if (req.body?.[k] === undefined) continue;
    await q("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2", [k, JSON.stringify(req.body[k])]);
  }
  res.json({ ok: true });
}));

/* ---------- errors ---------- */
function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}
app.use("/api", (req, res) => res.status(404).json({ error: "Topilmadi" }));
app.use((err, req, res, next) => {
  if (err.code === "23505") return res.status(409).json({ error: "Bu slug band" });
  if (err.code === "23503") return res.status(400).json({ error: "Bunday bo‘lim yo‘q" });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Server xatosi" });
});

/* ---------- start ---------- */
await migrate();
if (await seed()) console.log("Seeded books, news and settings from seed/data.js");
if (!process.env.ADMIN_PASSWORD) console.warn("! ADMIN_PASSWORD is not set; admin login is disabled.");
if (process.env.SYNC_ON_START === "1" && !(await q("SELECT 1 FROM uzum_products LIMIT 1")).rowCount) {
  startSync().then(({ id }) => console.log(`Initial Uzum sync started (run ${id})`));
}

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));
