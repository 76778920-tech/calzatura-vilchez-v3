#!/usr/bin/env node
/**
 * Genera par RSA + certificado autofirmado para firma PKCS#7 de pedidos.
 * Uso: node scripts/generate-order-nr-keypair.mjs
 *
 * Configurar en Render (secrets):
 *   ORDER_NR_PRIVATE_KEY_PEM  o  ORDER_NR_PRIVATE_KEY_PEM_BASE64
 *   ORDER_NR_CERT_PEM         o  ORDER_NR_CERT_PEM_BASE64
 */
import forge from "node-forge";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(ROOT, "artifacts", "order-nr-keys");
fs.mkdirSync(outDir, { recursive: true });

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = "01";
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);
const cn = [{ name: "commonName", value: "Calzatura Vilchez Order Non-Repudiation" }];
cert.setSubject(cn);
cert.setIssuer(cn);
cert.sign(keys.privateKey, forge.md.sha256.create());

const privatePem = forge.pki.privateKeyToPem(keys.privateKey);
const certPem = forge.pki.certificateToPem(cert);

fs.writeFileSync(path.join(outDir, "order-nr-private.pem"), privatePem, "utf8");
fs.writeFileSync(path.join(outDir, "order-nr-cert.pem"), certPem, "utf8");

console.log("OK: claves generadas en artifacts/order-nr-keys/");
console.log("  order-nr-private.pem  → ORDER_NR_PRIVATE_KEY_PEM (solo servidor, nunca en Git)");
console.log("  order-nr-cert.pem     → ORDER_NR_CERT_PEM");
console.log("\nBase64 (una línea para Render):");
console.log("ORDER_NR_PRIVATE_KEY_PEM_BASE64=" + Buffer.from(privatePem, "utf8").toString("base64"));
console.log("ORDER_NR_CERT_PEM_BASE64=" + Buffer.from(certPem, "utf8").toString("base64"));
