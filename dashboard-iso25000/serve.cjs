// Punto de entrada legacy — delega al servidor unificado (4321).
const { spawnSync } = require("child_process");
const path = require("path");

const port = process.argv[2];
const args = [path.join(__dirname, "server.mjs")];
if (port) args.push(port);

const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: __dirname });
process.exit(result.status ?? 1);
