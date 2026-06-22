import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJsonRepository } from "./repository-json.mjs";
import { buildSeedDb } from "./seed.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "qc-db.json");

describe("repository-json — persistencia local", () => {
  beforeEach(() => {
    if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
  });

  it("isEmpty + applySeed + listEvaluaciones", async () => {
    const repo = createJsonRepository();
    assert.equal(await repo.isEmpty(), true);
    await repo.applySeed(buildSeedDb());
    assert.equal(await repo.isEmpty(), false);
    const list = await repo.listEvaluaciones();
    assert.equal(list.length, 1);
    assert.equal(list[0].codigo, "QC-AF-2026-Q2");
  });

  it("getChildren devuelve 25 funciones Must", async () => {
    const repo = createJsonRepository();
    await repo.applySeed(buildSeedDb());
    const ev = (await repo.listEvaluaciones())[0];
    const children = await repo.getChildren(ev.id);
    assert.equal(children.funciones.length, 25);
    assert.equal(children.transacciones.length, 10);
    assert.equal(children.casos_prueba.length, 10);
  });

  it("createEvaluacion rechaza código duplicado", async () => {
    const repo = createJsonRepository();
    await repo.applySeed(buildSeedDb());
    await assert.rejects(
      () => repo.createEvaluacion({ codigo: "QC-AF-2026-Q2", titulo: "Otra" }),
      /Código duplicado/,
    );
  });

  it("deleteEvaluacion elimina en cascada (JSON)", async () => {
    const repo = createJsonRepository();
    await repo.applySeed(buildSeedDb());
    const ev = (await repo.listEvaluaciones())[0];
    assert.equal(await repo.deleteEvaluacion(ev.id), true);
    assert.equal(await repo.isEmpty(), true);
  });
});
