// Admin login: one password from ADMIN_PASSWORD, a signed httpOnly cookie, 7-day sessions.

import crypto from "node:crypto";

const COOKIE = "falaq_admin";
const TTL_MS = 7 * 24 * 3600 * 1000;
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

export function checkPassword(given) {
  const want = Buffer.from(process.env.ADMIN_PASSWORD || "");
  const got = Buffer.from(String(given || ""));
  return want.length > 0 && got.length === want.length && crypto.timingSafeEqual(got, want);
}

export function setSession(res) {
  const exp = String(Date.now() + TTL_MS);
  res.setHeader("Set-Cookie",
    `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL_MS / 1000}`);
}

export function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

export function isAdmin(req) {
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const want = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

export function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: "Kirish talab qilinadi" });
}
