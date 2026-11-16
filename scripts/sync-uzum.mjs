#!/usr/bin/env node
// Uzum Market → website. Reads the shop's products through the official Uzum Seller OpenAPI and
// writes their public fields (title, photo, price, stock, link) to frontend/uzum.js, which the
// site reads. The API key stays in .env on this machine; it never reaches uzum.js or the site.
//
// Run:          npm run sync:uzum          (updates frontend/uzum.js)
// Check only:   npm run sync:uzum:check    (prints the result, writes nothing)
// Daily on the server, for example with cron:
//               15 6 * * *  cd /path/to/falaq_landing && npm run sync:uzum
//
// Keys come from .env (see .env.example). Uzum's firewall answers only requests from
// Uzbekistan, so run it there.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { UzumClient } from "./uzum-client.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA_FILE = `${ROOT}frontend/data.js`;
const OUT_FILE = `${ROOT}frontend/uzum.js`;
const DRY_RUN = process.argv.includes("--dry-run");

// Not shown on the site at all
const HIDDEN = new Set(["ARCHIVED", "DELETED", "PERM_BANNED"]);
// Shown, but cannot be bought
const NOT_BUYABLE = new Set(["NO_SKU", "RUN_OUT", "BLOCKED", "SKU_BLOCKED", "NOT_READY_TO_SEND", ...HIDDEN]);

const CYR = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y",
  к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ў: "o",
  ф: "f", х: "x", ҳ: "h", ц: "s", ч: "ch", ш: "sh", щ: "sh", ъ: "", ь: "", ы: "i", э: "e", ю: "yu", я: "ya",
};

/** Lowercase Latin words: "Binafsha shu’lasi II" → "binafsha shulasi ii" (Cyrillic transliterated). */
function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (c) => CYR[c] ?? c)
    .replace(/[’‘ʻʼ'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** KEY=value lines from .env, without overriding variables that are already set. */
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

function loadSite() {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(DATA_FILE, "utf8"), sandbox);
  return sandbox.window.FALAQ;
}

/** The fields the site shows. The cheapest variant in stock sets the price. */
function toProduct(p) {
  const id = Number(p.productId ?? p.id);
  if (!id) return null;
  const skus = (p.skuList ?? []).filter((s) => !s.archived);
  const priceOf = (list) => list.map((s) => Number(s.price)).filter((n) => Number.isFinite(n) && n > 0);
  // Cheapest variant that is in stock; if every variant is sold out, the cheapest overall.
  const available = skus.filter((s) => (Number(s.quantityActive) || 0) + (Number(s.quantityFbs) || 0) > 0);
  const prices = priceOf(available).length ? priceOf(available) : priceOf(skus);
  const sum = (k) => skus.reduce((t, s) => t + (Number(s[k]) || 0), 0);
  const qty = (Number(p.quantityActive ?? sum("quantityActive")) || 0) + (Number(p.quantityFbs ?? sum("quantityFbs")) || 0);
  const status = p.status?.value ?? p.status ?? null;
  const title = String(p.title ?? "").trim();
  const rating = Number.parseFloat(p.rating);
  const image = p.image || p.previewImg || skus[0]?.previewImage || null;
  return {
    id,
    title,
    price: prices.length ? Math.min(...prices) : null,
    fullPrice: null,
    image: typeof image === "string" && image.startsWith("https://") ? image : null,
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    reviews: null,
    inStock: qty > 0 && !NOT_BUYABLE.has(status) && prices.length > 0,
    delivery: null,
    category: (typeof p.category === "string" ? p.category : p.category?.title) || null,
    status,
    url: `https://uzum.uz/uz/product/${normalize(title).replace(/ /g, "-") || "product"}-${id}`,
  };
}

// A book keeps the product set as `uzumId` in data.js while it is still on Uzum. Otherwise it gets
// a product whose title contains the book title as whole words and names no other book before it
// (so "Yusufning qizi (Fotimaning bolasi-2)" goes to Yusufning qizi only), preferring the title
// near the start, no part II etc. after it, in stock, then most reviews.
function linkBooks(books, products) {
  const live = new Set(products.map((p) => p.id));
  const names = books.map((b) => normalize(b.title)).filter(Boolean);
  const links = {};
  for (const b of books) {
    if (b.uzumId && live.has(Number(b.uzumId))) {
      links[b.slug] = Number(b.uzumId);
      continue;
    }
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
    if (hits[0]) links[b.slug] = hits[0].id;
  }
  return links;
}

const sum = (n) => (n == null ? "narxsiz" : `${n.toLocaleString("ru-RU").replace(/\s/g, " ")} so‘m`);

async function main() {
  loadEnv(`${ROOT}.env`);
  const key = process.env.UZUM_API_KEY?.trim().replace(/^bearer\s+/i, "");
  if (!key) throw new Error("UZUM_API_KEY is not set (put it in .env, see .env.example).");

  const client = new UzumClient({
    key,
    base: process.env.UZUM_API_BASE || "https://api-seller.uzum.uz/api/seller-openapi",
  });
  const shops = await client.shops();
  if (!shops.length) throw new Error("This API key does not see any shop.");
  const wanted = process.env.UZUM_SHOP_ID?.trim();
  let shop = wanted ? shops.find((s) => String(s.id) === wanted) : shops[0];
  if (!shop) {
    console.warn(`! UZUM_SHOP_ID=${wanted} is not on this key. Available: ${shops.map((s) => `${s.id} (${s.name})`).join(", ")}`);
    shop = shops[0];
  }
  console.log(`Shop: ${shop.name} (id ${shop.id})`);

  const raw = await client.allProducts(shop.id);
  const products = raw
    .map(toProduct)
    .filter((p) => p && !HIDDEN.has(p.status))
    .map(({ status, ...p }) => p)
    .sort((a, z) => Number(z.inStock) - Number(a.inStock) || (z.reviews || 0) - (a.reviews || 0) || a.title.localeCompare(z.title));
  console.log(`Products: ${raw.length} on Uzum, ${products.length} shown on the site, ${products.filter((p) => p.inStock).length} in stock.`);
  if (client.dailyRemaining != null) console.log(`Daily quota left: ${client.dailyRemaining} requests.`);

  const site = loadSite();
  const books = linkBooks(site.books, products);
  const byId = new Map(products.map((p) => [p.id, p]));
  console.log("\nBooks:");
  for (const b of site.books) {
    const p = byId.get(books[b.slug]);
    console.log(p
      ? `  ✓ ${b.title} → ${p.title} (${p.id}), ${sum(p.price)}, ${p.inStock ? "in stock" : "sold out"}`
      : `  – ${b.title}: no product found (set uzumId in data.js)`);
  }

  const data = {
    updatedAt: new Date().toISOString(),
    shop: { id: shop.id, title: shop.name, url: site.links?.uzum ?? null },
    books,
    products,
  };
  const file = `/* Generated by scripts/sync-uzum.mjs (npm run sync:uzum). Do not edit by hand. */\nwindow.UZUM = ${JSON.stringify(data, null, 1)};\n`;
  if (DRY_RUN) {
    console.log("\nCheck only: frontend/uzum.js not changed.");
    return;
  }
  writeFileSync(OUT_FILE, file);
  console.log(`\n✓ frontend/uzum.js updated: ${products.length} products, ${Object.keys(books).length} books linked.`);
}

main().catch((e) => {
  console.error(`✗ Uzum sync failed: ${e.message}`);
  console.error("  The site keeps the last uzum.js.");
  process.exit(1);
});
