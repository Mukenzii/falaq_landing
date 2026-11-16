#!/usr/bin/env node
// Google Sheet → website: reads the bookshop list (the "Do'kon lokatsiya" sheet) and writes the
// public columns of each shop (name, type, hours, phone, map position) to frontend/stores.js. Book
// pages show the three nearest to the visitor. Other columns (agent, contact person) never reach
// the site, and the sheet's ID stays in .env.
//
// Run:          npm run sync:stores          (updates frontend/stores.js)
// Check only:   npm run sync:stores:check    (prints the result, writes nothing)
// From a file:  node scripts/sync-stores.mjs --file shops.csv   (a CSV downloaded from the sheet)
//
// The sheet must be shared as "anyone with the link can view". Columns are found by their
// headings: "Do'kon nomi", "Do'kon ishlash vaqti", "Telefon", "Lokatsiya", plus the untitled
// column with the shop type. "Lokatsiya" may hold a Google Maps link (also a short
// maps.app.goo.gl one) or coordinates such as 41.3227,69.2374 or 39°45'27.3"N 64°25'28.8"E.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_FILE = `${ROOT}frontend/stores.js`;
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FROM_FILE = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;

/** KEY=value lines from .env, without overriding variables that are already set. */
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}

/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Uzbekistan and its neighbours; anything outside is a typo or swapped numbers.
const plausible = (lat, lng) => lat > 35 && lat < 47 && lng > 50 && lng < 80;

/** A map position from a link or typed coordinates, or null. */
function coordsFrom(text) {
  let s = String(text);
  try { s = decodeURIComponent(s); } catch { /* keep as is */ }
  const pair = (a, b) => {
    const lat = Number(a), lng = Number(b);
    return Number.isFinite(lat) && Number.isFinite(lng) && plausible(lat, lng) ? { lat, lng } : null;
  };
  // Google Maps place links name the exact pin as !3d<lat>!4d<lng>.
  const pins = [...s.matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)];
  if (pins.length) return pair(pins.at(-1)[1], pins.at(-1)[2]);
  let m = s.match(/[?&](?:q|ll|query|destination)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (m) return pair(m[1], m[2]);
  m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return pair(m[1], m[2]);
  // 39°45'27.3"N 64°25'28.8"E (the E may be missing)
  m = s.match(/(\d{1,3})°\s*(\d{1,2})'\s*(\d+(?:\.\d+)?)"?\s*([NS])[\s,+]*(\d{1,3})°\s*(\d{1,2})'\s*(\d+(?:\.\d+)?)"?\s*([EW])?/i);
  if (m) {
    const dms = (d, mi, se, h) => (Number(d) + Number(mi) / 60 + Number(se) / 3600) * (/[SW]/i.test(h ?? "") ? -1 : 1);
    return pair(dms(m[1], m[2], m[3], m[4]), dms(m[5], m[6], m[7], m[8]));
  }
  m = s.match(/(?:^|[^\d.])(-?\d{2}\.\d{3,})\s*,\s*(-?\d{2}\.\d{3,})/);
  if (m) return pair(m[1], m[2]);
  return null;
}

/** Short Google Maps links (maps.app.goo.gl/…) carry no position; their redirect does. */
async function resolveShortLink(url) {
  let next = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(next, { redirect: "manual", signal: AbortSignal.timeout(15000) });
    const location = res.headers.get("location");
    if (!location) return null;
    next = new URL(location, next).toString();
    const c = coordsFrom(next);
    if (c) return c;
  }
  return null;
}

/** "903857878   907000110" → ["+998 90 385 78 78", "+998 90 700 01 10"]; other numbers go to `bad`. */
function phonesFrom(text, bad) {
  const out = [];
  for (const chunk of String(text).split(/\s{2,}|[,;/]|\s(?=\+?\d{9,})/)) {
    let digits = chunk.replace(/\D/g, "");
    if (!digits) continue;
    // Two numbers typed together without a separator
    const parts = digits.length === 18 ? [digits.slice(0, 9), digits.slice(9)] : [digits];
    for (let d of parts) {
      if (d.length === 9) d = `998${d}`;
      if (/^998\d{9}$/.test(d)) out.push(`+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`);
      else bad.push(d);
    }
  }
  return [...new Set(out)];
}

const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

async function readSheet() {
  if (FROM_FILE) return readFileSync(FROM_FILE, "utf8");
  const id = process.env.SHEET_ID?.trim();
  if (!id) throw new Error("SHEET_ID is not set (put the Google Sheet's ID in .env, see .env.example).");
  if (!/^[\w-]{20,}$/.test(id)) throw new Error("SHEET_ID does not look like a Google Sheet ID.");
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  if (!res.ok || /^\s*<!doctype html/i.test(text)) {
    throw new Error(`could not download the sheet (HTTP ${res.status}). Is it shared as "anyone with the link can view"?`);
  }
  return text;
}

async function main() {
  loadEnv(`${ROOT}.env`);
  const rows = parseCsv(await readSheet());
  const header = (rows[0] ?? []).map((h) => tidy(h).toLowerCase());
  const col = (re) => header.findIndex((h) => re.test(h));
  const NAME = col(/nomi/), HOURS = col(/vaqt/), PHONE = col(/telefon/), PLACE = col(/lokatsiya|location|manzil/);
  if (NAME < 0 || PLACE < 0) throw new Error(`the sheet needs "Do'kon nomi" and "Lokatsiya" columns; found: ${rows[0]}`);
  const body = rows.slice(1).filter((r) => r.some((c) => tidy(c)));
  // The shop type is the untitled column with only a few different values (Kitob do'kon, ...).
  const TYPE = header.findIndex((h, i) => !h && new Set(body.map((r) => tidy(r[i])).filter(Boolean)).size <= 20);

  const stores = [];
  const skipped = [];
  const badPhones = [];
  const seen = new Set();
  for (const [i, r] of body.entries()) {
    const line = i + 2; // sheet row number
    const type = TYPE >= 0 ? capital(tidy(r[TYPE])) : "";
    const name = tidy(r[NAME]) || type || "Kitob do‘koni";
    const place = tidy(r[PLACE]);
    if (!place) { skipped.push(`row ${line} ${name}: no location`); continue; }
    let pos = coordsFrom(place);
    if (!pos && /goo\.gl\//.test(place)) {
      try { pos = await resolveShortLink(place.match(/https?:\/\/\S+/)?.[0] ?? place); } catch { pos = null; }
    }
    if (!pos) {
      skipped.push(/goo\.gl\//.test(place)
        ? `row ${line} ${name}: could not open the short link ${place} (try again, or paste the full Google Maps link)`
        : `row ${line} ${name}: no coordinates in "${place.slice(0, 60)}${place.length > 60 ? "…" : ""}" (use a Google Maps link)`);
      continue;
    }
    const lat = Math.round(pos.lat * 1e6) / 1e6, lng = Math.round(pos.lng * 1e6) / 1e6;
    const key = `${name.toLowerCase()}|${lat}|${lng}`;
    if (seen.has(key)) continue; // the same shop entered twice
    seen.add(key);
    const bad = [];
    const phones = PHONE >= 0 ? phonesFrom(r[PHONE], bad) : [];
    if (bad.length) badPhones.push(`row ${line} ${name}: ${bad.join(", ")}`);
    stores.push({
      name,
      type,
      hours: HOURS >= 0 ? tidy(r[HOURS]) : "",
      phones,
      lat,
      lng,
    });
  }

  console.log(`Shops: ${body.length} rows, ${stores.length} on the map, ${skipped.length} skipped.`);
  if (skipped.length) console.log(`\nNot on the map (fix in the sheet):\n  ${skipped.join("\n  ")}`);
  if (badPhones.length) console.log(`\nPhone numbers left out, not a valid Uzbek number (fix in the sheet):\n  ${badPhones.join("\n  ")}`);
  if (!stores.length) throw new Error("no shop with a map position; frontend/stores.js not changed.");

  const file = `/* Generated by scripts/sync-stores.mjs (npm run sync:stores) from the shop sheet. Do not edit by hand. */\nwindow.STORES = ${JSON.stringify(stores, null, 1)};\n`;
  if (DRY_RUN) {
    console.log("\nCheck only: frontend/stores.js not changed.");
    return;
  }
  writeFileSync(OUT_FILE, file);
  console.log(`\n✓ frontend/stores.js updated: ${stores.length} shops.`);
}

main().catch((e) => {
  console.error(`✗ Shop sync failed: ${e.message}`);
  console.error("  The site keeps the last stores.js.");
  process.exit(1);
});
