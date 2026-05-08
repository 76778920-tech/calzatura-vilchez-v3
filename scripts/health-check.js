#!/usr/bin/env node
// Verifica el estado de todos los servicios del sistema Calzatura Vilchez

const SERVICES = [
  {
    name: "Frontend (local)",
    url: "http://localhost:5173",
    env: "local",
  },
  {
    name: "AI Service (local)",
    url: "http://localhost:8000/api/health",
    env: "local",
  },
  {
    name: "Firebase Emulator UI (local)",
    url: "http://localhost:4000",
    env: "local",
  },
  {
    name: "AI Service (producción)",
    url: "https://calzatura-vilchez-v3.onrender.com/api/health",
    env: "production",
  },
  {
    name: "Frontend (producción)",
    url: "https://calzaturavilchez-ab17f.web.app",
    env: "production",
  },
];

const MODE = process.argv[2] ?? "all";
const TIMEOUT_MS = MODE === "prod" ? 30000 : 8000;

async function checkService(service) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(service.url, { signal: controller.signal });
    const ms = Date.now() - start;
    const ok = res.ok;
    return { ...service, ok, status: res.status, ms };
  } catch (err) {
    const ms = Date.now() - start;
    const timedOut = err.name === "AbortError";
    return { ...service, ok: false, status: timedOut ? "TIMEOUT" : "ERROR", ms, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function icon(ok) { return ok ? "✅" : "❌"; }

async function main() {
  const targets = MODE === "prod"
    ? SERVICES.filter(s => s.env === "production")
    : MODE === "local"
    ? SERVICES.filter(s => s.env === "local")
    : SERVICES;

  console.log(`\n🔍 Calzatura Vilchez — Health Check [${MODE}]\n${"─".repeat(55)}`);

  const results = await Promise.all(targets.map(checkService));

  let allOk = true;
  for (const r of results) {
    if (!r.ok) allOk = false;
    const badge = icon(r.ok);
    const time = r.ms < TIMEOUT_MS ? `${r.ms}ms` : "—";
    console.log(`${badge}  ${r.name.padEnd(32)} ${String(r.status).padEnd(6)} ${time}`);
    if (r.error && !r.ok) console.log(`   └─ ${r.error}`);
  }

  console.log("─".repeat(55));
  console.log(allOk
    ? "✅  Todos los servicios operativos\n"
    : "❌  Uno o más servicios con problemas\n");

  process.exit(allOk ? 0 : 1);
}

main();
