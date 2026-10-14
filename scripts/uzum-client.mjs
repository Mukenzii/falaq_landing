// Uzum Seller Open API client (Node.js 18+, no dependencies).
//
// Follows the API rules:
//   - the Authorization header carries the raw key, without "Bearer"
//   - ~2 requests/s per key: requests run one at a time, 500 ms apart
//   - 429: if the daily quota is used up (x-ratelimit-remaining-per-day = 0) do not retry;
//     if it is the per-second limit, wait briefly and retry
//   - a 403 with an HTML body comes from the WAF (often a non-Uzbek IP), not from a bad key
//   - 5xx and network errors are retried with backoff (0.8 → 1.6 → 3.2 → 6.4 s)
//   - responses arrive either wrapped in { payload } or as the bare value

const MIN_GAP_MS = 500;
const MAX_RETRIES = 4;
const TIMEOUT_MS = 30_000;

export class UzumApiError extends Error {
  /** kind: "auth" | "waf" | "daily-quota" | "bad-request" | "server" | "network" */
  constructor(message, { status, kind } = {}) {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class UzumClient {
  constructor({ key, base, language = "uz" }) {
    if (!key) throw new UzumApiError("UZUM_API_KEY is empty. Add your key to the .env file.", { kind: "auth" });
    this.key = key.trim().replace(/^bearer\s+/i, "");
    this.base = base.replace(/\/+$/, "");
    this.language = language;
    this.lastAt = 0;
    this.dailyRemaining = null;
  }

  async get(path, query = {}) {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }

    for (let attempt = 0; ; attempt++) {
      const wait = this.lastAt + MIN_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastAt = Date.now();

      let res;
      try {
        res = await fetch(url, {
          headers: { Authorization: this.key, Accept: "application/json", "Accept-Language": this.language },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (e) {
        if (attempt < MAX_RETRIES) { await sleep(800 * 2 ** attempt); continue; }
        throw new UzumApiError(`Could not reach Uzum: ${e.cause?.code || e.message}`, { kind: "network" });
      }

      const perDay = res.headers.get("x-ratelimit-remaining-per-day");
      if (perDay != null) this.dailyRemaining = Number(perDay);

      const type = res.headers.get("content-type") || "";
      const text = await res.text();
      const json = type.includes("json") && text ? safeJson(text) : null;

      if (res.ok) {
        if (json && !Array.isArray(json) && typeof json === "object" && "payload" in json) return json.payload;
        return json;
      }

      if (res.status === 429) {
        if (this.dailyRemaining === 0) {
          throw new UzumApiError("Daily request quota is used up. Run the sync again tomorrow.", { status: 429, kind: "daily-quota" });
        }
        if (attempt < MAX_RETRIES) { await sleep(1000 * 2 ** attempt); continue; }
      }

      if ((res.status === 401 || res.status === 403) && !type.includes("json")) {
        throw new UzumApiError(
          "Uzum's firewall (WAF) blocked the request. The key may be fine; " +
          "try running the sync from an internet connection in Uzbekistan.",
          { status: res.status, kind: "waf" },
        );
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) { await sleep(800 * 2 ** attempt); continue; }

      const detail = json?.errors?.[0]?.message || json?.message || json?.error || text.slice(0, 160) || res.statusText;
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        throw new UzumApiError(
          `Key was rejected (${res.status}: ${detail}). Copy it again from seller.uzum.uz → API keys, without "Bearer".`,
          { status: res.status, kind: "auth" },
        );
      }
      throw new UzumApiError(`Uzum error ${res.status}: ${detail}`, {
        status: res.status,
        kind: res.status >= 500 ? "server" : "bad-request",
      });
    }
  }

  /** GET /v1/shops → [{ id, name }] */
  async shops() {
    const data = await this.get("/v1/shops");
    return Array.isArray(data) ? data : data?.shops ?? [];
  }

  /** GET /v1/product/shop/{shopId}, all pages */
  async allProducts(shopId, { size = 100 } = {}) {
    const out = [];
    for (let page = 0; ; page++) {
      const data = await this.get(`/v1/product/shop/${shopId}`, { page, size });
      const list = data?.productList ?? (Array.isArray(data) ? data : []);
      out.push(...list);
      // Uzum may return smaller pages than requested, so stop on the reported total when there is one.
      const total = Number(data?.totalProductsAmount);
      if (!list.length || (Number.isFinite(total) ? out.length >= total : list.length < size)) break;
      if (page > 500) throw new Error("Pagination did not stop after 500 pages; check the response shape.");
    }
    return out;
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}
