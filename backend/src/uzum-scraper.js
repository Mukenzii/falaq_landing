// Uzum Market scraper.
//
// Opens the shop page in headless Chromium the way a visitor would. The page fetches an anonymous
// token for Uzum's GraphQL API; we reuse the page's own headers to page through the shop's catalog
// with a small query of our own. Nothing here needs a seller account or API key.
//
// If the shop lists no products (Uzum shows an empty shop while it is paused), the scraper can fall
// back to a catalog search and keep only items whose title mentions the publisher.

import { chromium } from "playwright";

const SITE = "https://uzum.uz";
const GRAPHQL = "https://graphql.uzum.uz/";
const PAGE_SIZE = 48;
const MAX_ITEMS = 2000;

const SEARCH_QUERY = `query FalaqSync($q: MakeSearchQueryInput!) {
  makeSearch(query: $q) {
    total
    items {
      catalogCard {
        __typename
        discovery {
          title
          ... on DiscoverySkuGroupCard { id productId }
          ... on DiscoverySkuCard { id productId }
          ... on DiscoveryProductCard { id }
          defaultSkuId
          priceBlock { sellPrice { amount } fullPrice { amount } }
          feedback { quantity rating }
          photos { link(trans: SIZE_540) { high } }
        }
        buyingOptions { deliveryOptions { stockType shortDate } }
      }
    }
  }
}`;

/**
 * @param {{ shop: string, fallbackQuery?: string, fallbackMatch?: string, log?: (s: string) => void }} opts
 * @returns {Promise<{ shop: object|null, source: "shop"|"search", products: object[] }>}
 */
export async function scrapeUzum({ shop, fallbackQuery, fallbackMatch, log = () => {} }) {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({ locale: "uz-UZ" });

    let headers = null;
    page.on("request", (r) => {
      if (!headers && r.url().startsWith(GRAPHQL) && r.headers().authorization) headers = r.headers();
    });

    const shopUrl = `${SITE}/uz/shop/${encodeURIComponent(shop)}`;
    log(`Sahifa ochilmoqda: ${shopUrl}`);
    await page.goto(shopUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    for (let i = 0; i < 60 && !headers; i++) await page.waitForTimeout(500);
    if (!headers) throw new Error("Uzum sahifasi GraphQL so‘rovini yubormadi (token olinmadi).");

    const gqlHeaders = { "content-type": "application/json" };
    for (const k of ["authorization", "x-iid", "apollographql-client-name", "apollographql-client-version", "city-id"]) {
      if (headers[k]) gqlHeaders[k] = headers[k];
    }
    gqlHeaders["accept-language"] = "uz";

    const info = await page.evaluate(async (u) => {
      const r = await fetch(u);
      return r.ok ? (await r.json()).payload : null;
    }, `https://api.uzum.uz/api/shop/${encodeURIComponent(shop)}`);
    const shopInfo = info && {
      id: info.id, title: info.title, link: info.link, rating: info.rating,
      reviews: info.reviews, orders: info.orders, avatar: info.avatar, banner: info.banner, url: shopUrl,
    };
    if (!shopInfo) log(`! "${shop}" do‘koni topilmadi.`);
    else log(`Do‘kon: ${shopInfo.title} (id ${shopInfo.id}), reyting ${shopInfo.rating}, ${shopInfo.orders} buyurtma`);

    const search = async (input) => {
      const out = [];
      for (let offset = 0; offset < MAX_ITEMS; offset += PAGE_SIZE) {
        const body = JSON.stringify({
          query: SEARCH_QUERY,
          variables: { q: { showAdultContent: "NONE", filters: [], sort: "BY_RELEVANCE_DESC", ...input, pagination: { offset, limit: PAGE_SIZE } } },
        });
        const res = await page.evaluate(async ({ url, h, body }) => {
          const r = await fetch(url, { method: "POST", headers: h, body });
          return { status: r.status, text: await r.text() };
        }, { url: GRAPHQL, h: gqlHeaders, body });
        if (res.status !== 200) throw new Error(`Uzum GraphQL ${res.status}: ${res.text.slice(0, 200)}`);
        const json = JSON.parse(res.text);
        if (json.errors?.length) throw new Error(`Uzum GraphQL: ${json.errors[0].message}`);
        const ms = json.data.makeSearch;
        out.push(...ms.items.map((i) => i.catalogCard));
        if (!ms.items.length || out.length >= ms.total) break;
        await page.waitForTimeout(400);
      }
      return out;
    };

    let source = "shop";
    let cards = shopInfo ? await search({ shopId: String(shopInfo.id) }) : [];
    log(`Do‘kon sahifasida ${cards.length} ta mahsulot.`);

    if (!cards.length && fallbackQuery) {
      source = "search";
      log(`Do‘kon bo‘sh. Uzum qidiruvi ishlatiladi: "${fallbackQuery}"`);
      const re = new RegExp(fallbackMatch || fallbackQuery, "i");
      const all = await search({ text: fallbackQuery });
      cards = all.filter((c) => re.test(c?.discovery?.title || ""));
      log(`Qidiruvda ${all.length} ta natija, nomida "${re.source}" borlari: ${cards.length}.`);
    }

    const seen = new Set();
    const products = [];
    for (const c of cards) {
      const p = toProduct(c);
      if (p && !seen.has(p.id)) { seen.add(p.id); products.push(p); }
    }
    return { shop: shopInfo, source, products };
  } finally {
    await browser.close();
  }
}

// One Uzum product can hold several SKU groups (e.g. a "bundle" listing where each variant is a
// different book), so an item here is a SKU group; `productId` is kept for the product URL.
function toProduct(card) {
  const d = card?.discovery;
  if (!d) return null;
  const id = Number(d.id);
  const productId = Number(d.productId ?? d.id);
  if (!id || !productId) return null;
  const title = String(d.title || "").trim();
  const sell = d.priceBlock?.sellPrice?.amount ?? null;
  const full = d.priceBlock?.fullPrice?.amount ?? null;
  const sku = d.defaultSkuId ? `?skuId=${d.defaultSkuId}` : "";
  return {
    id,
    productId,
    title,
    price: sell,
    fullPrice: full && full > sell ? full : null,
    image: d.photos?.[0]?.link?.high ?? null,
    images: (d.photos || []).map((p) => p.link?.high).filter(Boolean),
    rating: d.feedback?.rating || null,
    reviews: d.feedback?.quantity ?? null,
    // Uzum's catalog search only returns items that can be ordered.
    inStock: sell != null,
    delivery: card.buyingOptions?.deliveryOptions?.shortDate ?? null,
    url: `${SITE}/uz/product/${urlSlug(title)}-${productId}${sku}`,
  };
}

// Uzbek Cyrillic → Latin, then a plain lowercase word list. Shared with book matching.
const CYR = {
  а: "a", б: "b", в: "v", г: "g", ғ: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y",
  к: "k", қ: "q", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ў: "o",
  ф: "f", х: "x", ҳ: "h", ц: "s", ч: "ch", ш: "sh", щ: "sh", ъ: "", ь: "", ы: "i", э: "e", ю: "yu", я: "ya",
};
export function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[Ѐ-ӿ]/g, (c) => CYR[c] ?? c)
    .replace(/[’‘ʻʼ'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const urlSlug = (s) => normalize(s).replace(/ /g, "-") || "product";
