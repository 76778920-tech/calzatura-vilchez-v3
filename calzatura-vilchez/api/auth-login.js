/**
 * Vercel Serverless: proxy de login (Identity Toolkit + custom token).
 * URL del cliente: VITE_AUTH_PROXY_LOGIN_URL=https://<proyecto>.vercel.app/api/auth-login
 *
 * Variables en Vercel (Environment): FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_WEB_API_KEY
 * Opcional: ALLOWED_ORIGINS (coma) para orígenes extra del SPA.
 */
import admin from "firebase-admin";

const LOGIN_RATE_WINDOW_MS = 30 * 60 * 1000;
const LOGIN_RATE_MAX = 15;
const loginRateByIp = new Map();

const DEFAULT_ORIGINS = new Set([
  "https://calzaturavilchez-ab17f.web.app",
  "https://calzaturavilchez-ab17f.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function loadAllowedOrigins() {
  const extras = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extras]);
}

const allowedOrigins = loadAllowedOrigins();

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isLoginRateLimited(ip) {
  const now = Date.now();
  let row = loginRateByIp.get(ip);
  if (!row || now > row.resetAt) {
    row = { count: 0, resetAt: now + LOGIN_RATE_WINDOW_MS };
  }
  if (row.count >= LOGIN_RATE_MAX) {
    loginRateByIp.set(ip, row);
    return true;
  }
  row.count += 1;
  loginRateByIp.set(ip, row);
  if (loginRateByIp.size > 5000) {
    for (const [k, v] of loginRateByIp) {
      if (now > v.resetAt) loginRateByIp.delete(k);
    }
  }
  return false;
}

const LOGIN_EMAIL_RE =
  /^[A-Za-z0-9_+~-]+(?:\.[A-Za-z0-9_+~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

function isValidLoginEmail(email) {
  if (typeof email !== "string") return false;
  const t = email.trim().toLowerCase();
  return t.length <= 100 && LOGIN_EMAIL_RE.test(t);
}

function isValidLoginPassword(password) {
  return typeof password === "string" && password.length >= 1 && password.length <= 128;
}

let adminReady = false;

function ensureAdmin() {
  if (adminReady) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
  });
  adminReady = true;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origen no permitido" });
  }

  const ip = getClientIp(req);
  if (isLoginRateLimited(ip)) {
    const retryAfterSec = Math.ceil(LOGIN_RATE_WINDOW_MS / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    return res.status(429).json({ ok: false });
  }

  try {
    ensureAdmin();
  } catch (e) {
    console.error("auth-login: init admin", e.message);
    return res.status(500).json({ ok: false });
  }

  const rawEmail = req.body?.email;
  const rawPassword = req.body?.password;
  if (!isValidLoginEmail(rawEmail) || !isValidLoginPassword(rawPassword)) {
    return res.status(401).json({ ok: false });
  }

  const email = String(rawEmail).trim().toLowerCase();
  const password = String(rawPassword);
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  if (!apiKey) {
    console.error("auth-login: falta FIREBASE_WEB_API_KEY");
    return res.status(500).json({ ok: false });
  }

  try {
    const identityUrl =
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
      encodeURIComponent(apiKey);
    const identityRes = await fetch(identityUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const identityJson = await identityRes.json();
    if (!identityRes.ok || !identityJson.localId) {
      return res.status(401).json({ ok: false });
    }

    const customToken = await admin.auth().createCustomToken(identityJson.localId);
    return res.status(200).json({ ok: true, customToken });
  } catch (e) {
    console.error("auth-login: error interno", e);
    return res.status(500).json({ ok: false });
  }
}
