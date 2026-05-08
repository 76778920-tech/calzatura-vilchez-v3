import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cli = path.join(root, "node_modules", "playwright", "cli.js");

const E2E_PORT = 5173;

/** Devuelve true si el puerto está ocupado. */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => { server.close(); resolve(false); });
    server.listen(port, "127.0.0.1");
  });
}

/** Libera el puerto matando el proceso que lo ocupa (Windows & Unix). */
function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano -p TCP 2>nul`, { encoding: "utf8" });
      const match = out.split("\n").find((l) => l.includes(`:${port} `) && l.includes("LISTENING"));
      if (match) {
        const pid = match.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid)) {
          execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
          console.log(`[run-playwright] Killed PID ${pid} on port ${port}`);
        }
      }
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
    }
  } catch {
    // Ignorar — si falla, Playwright dará su propio error
  }
}

// El webServer de Playwright inyecta VITE_E2E=true. Si el puerto ya está
// ocupado (p. ej. un dev server levantado manualmente), Playwright lo
// reutilizaría sin esa variable. Para evitarlo, matamos cualquier proceso
// en el puerto antes de que Playwright arranque su propio servidor.
if (await isPortInUse(E2E_PORT)) {
  console.log(`[run-playwright] Puerto ${E2E_PORT} ocupado; liberándolo para que Playwright inicie el servidor E2E…`);
  freePort(E2E_PORT);
  // Esperar un momento para que el SO libere el puerto
  await new Promise((r) => setTimeout(r, 800));
}

const env = { ...process.env };
delete env.NO_COLOR;
delete env.FORCE_COLOR;

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
