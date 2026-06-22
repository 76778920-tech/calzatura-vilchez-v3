#!/usr/bin/env node
import { getRepository } from "./repository.mjs";
import { buildSeedDb } from "./seed.mjs";

const repo = getRepository();
await repo.applySeed(buildSeedDb());
console.log(`Seed QC aplicado (${repo.backend}).`);
