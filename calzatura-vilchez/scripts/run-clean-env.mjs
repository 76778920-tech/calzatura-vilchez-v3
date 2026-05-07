import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const cliByTool = {
  eslint: path.join(root, "node_modules", "eslint", "bin", "eslint.js"),
  vitest: path.join(root, "node_modules", "vitest", "vitest.mjs"),
  tsc: path.join(root, "node_modules", "typescript", "bin", "tsc"),
  vite: path.join(root, "node_modules", "vite", "bin", "vite.js"),
};

const env = { ...process.env };
delete env.NO_COLOR;
delete env.FORCE_COLOR;

function splitCommands(args) {
  const commands = [];
  let current = [];
  for (const arg of args) {
    if (arg === "--next") {
      if (current.length > 0) commands.push(current);
      current = [];
      continue;
    }
    current.push(arg);
  }
  if (current.length > 0) commands.push(current);
  return commands;
}

function run([tool, ...args]) {
  const cli = cliByTool[tool];
  if (!cli) {
    console.error(`Unknown clean-env tool: ${tool}`);
    process.exit(1);
  }

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env,
      stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        resolve({ code: 1, signal });
        return;
      }
      resolve({ code: code ?? 1, signal: null });
    });
  });
}

for (const command of splitCommands(process.argv.slice(2))) {
  const result = await run(command);
  if (result.signal) {
    process.kill(process.pid, result.signal);
  }
  if (result.code !== 0) {
    process.exit(result.code);
  }
}
