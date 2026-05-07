import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cli = path.join(root, "node_modules", "playwright", "cli.js");

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
