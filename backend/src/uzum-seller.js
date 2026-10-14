// Uzum Seller OpenAPI source: the shop's own products, read with the key from seller.uzum.uz.
// Returns the same product shape as the page scraper, so sync.js can use either.

import { UzumClient } from "./uzum-seller-client.mjs";
import { normalize } from "./uzum-scraper.js";

// Not shown on the site at all
const HIDDEN = new Set(["ARCHIVED", "DELETED", "PERM_BANNED"]);
// Shown, but cannot be bought
const NOT_BUYABLE = new Set(["NO_SKU", "RUN_OUT", "BLOCKED", "SKU_BLOCKED", "NOT_READY_TO_SEND", ...HIDDEN]);

/**
 * @param {{ key: string, shopId?: string, log?: (s: string) => void }} opts
 * @returns {Promise<{ shop: object, source: "seller", products: object[] }>}
 */
export async function fetchSellerProducts({ key, shopId, log = () => {} }) {
  const client = new UzumClient({
    key,
    base: process.env.UZUM_API_BASE || "https://api-seller.uzum.uz/api/seller-openapi",
  });

  log("Uzum Seller API: do‘konlar ro‘yxati olinmoqda…");
  const shops = await client.shops();
  if (!shops.length) throw new Error("Bu API kalit hech qaysi do‘konni ko‘rmayapti.");
  let shop = shopId ? shops.find((s) => String(s.id) === String(shopId)) : shops[0];
  if (!shop) {
    log(`! UZUM_SHOP_ID=${shopId} bu kalitda yo‘q. Mavjud: ${shops.map((s) => `${s.id} (${s.name})`).join(", ")}`);
    shop = shops[0];
  }
  log(`Do‘kon: ${shop.name} (id ${shop.id})`);

  const raw = await client.allProducts(shop.id);
  const products = raw.map(toProduct).filter((p) => p && !HIDDEN.has(p.status));
  log(`Seller API: ${raw.length} ta mahsulot, saytda ko‘rsatiladi: ${products.length}.`);
  if (client.dailyRemaining != null) log(`Kunlik limitdan qoldi: ${client.dailyRemaining} so‘rov.`);

  return { shop: { id: shop.id, title: shop.name }, source: "seller", products };
}

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
    productId: id,
    title,
    price: prices.length ? Math.min(...prices) : null,
    fullPrice: null,
    image,
    images: image ? [image] : [],
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    reviews: null,
    inStock: qty > 0 && !NOT_BUYABLE.has(status) && prices.length > 0,
    delivery: null,
    status,
    url: `https://uzum.uz/uz/product/${normalize(title).replace(/ /g, "-") || "product"}-${id}`,
  };
}
