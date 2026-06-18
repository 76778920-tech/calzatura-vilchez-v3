"use strict";

const crypto = require("crypto");
const forge = require("node-forge");

const SIGNATURE_VERSION = "1";
/** @type {{ privateKeyPem: string, certPem: string } | null} */
let cachedEphemeral = null;

function readPemFromEnv(baseName) {
  const raw = process.env[baseName];
  if (raw && String(raw).trim()) {
    return String(raw).replace(/\\n/g, "\n");
  }
  const b64 = process.env[`${baseName}_BASE64`];
  if (b64 && String(b64).trim()) {
    return Buffer.from(String(b64).trim(), "base64").toString("utf8");
  }
  return null;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function getOrCreateEphemeralKeypair() {
  if (cachedEphemeral) return cachedEphemeral;
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
  const attrs = [{ name: "commonName", value: "calzatura-vilchez-order-nr-dev" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  cachedEphemeral = {
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    certPem: forge.pki.certificateToPem(cert),
  };
  return cachedEphemeral;
}

function loadSigningMaterial() {
  const privateKeyPem = readPemFromEnv("ORDER_NR_PRIVATE_KEY_PEM");
  const certPem = readPemFromEnv("ORDER_NR_CERT_PEM");
  if (privateKeyPem && certPem) {
    return { privateKeyPem, certPem, source: "env" };
  }
  if (isProductionRuntime()) {
    throw new Error("ORDER_NR_PRIVATE_KEY_PEM and ORDER_NR_CERT_PEM are required in production");
  }
  return { ...getOrCreateEphemeralKeypair(), source: "ephemeral" };
}

function stableItemsDigest(items) {
  return crypto.createHash("sha256").update(JSON.stringify(items ?? []), "utf8").digest("hex");
}

function buildPayload(order) {
  return {
    v: SIGNATURE_VERSION,
    orderId: order.id,
    userId: order.userId,
    userEmail: order.userEmail,
    estado: order.estado,
    metodoPago: order.metodoPago,
    subtotal: Number(order.subtotal),
    envio: Number(order.envio),
    total: Number(order.total),
    itemsDigest: stableItemsDigest(order.items),
    creadoEn: order.creadoEn,
    pagadoEn: order.pagadoEn || null,
    stockDescontadoEn: order.stockDescontadoEn || null,
    stripeSessionId: order.stripeSessionId || null,
    idempotencyKey: order.idempotencyKey || null,
  };
}

function payloadCanonicalJson(payload) {
  const keys = Object.keys(payload).sort();
  /** @type {Record<string, unknown>} */
  const sorted = {};
  for (const k of keys) sorted[k] = payload[k];
  return JSON.stringify(sorted);
}

function signPayloadCanonical(canonicalJson, privateKeyPem, certPem) {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const cert = forge.pki.certificateFromPem(certPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(canonicalJson, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
  });
  p7.sign();
  const pem = forge.pkcs7.messageToPem(p7);
  const payloadHash = crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
  return { pem, payloadHash, signedAt: new Date().toISOString() };
}

function verifyPkcs7Signature(canonicalJson, pkcs7Pem, certPem) {
  const p7 = forge.pkcs7.messageFromPem(pkcs7Pem);
  if (!p7.rawCapture?.signature) return false;
  p7.content = forge.util.createBuffer(canonicalJson, "utf8");
  const cert = forge.pki.certificateFromPem(certPem);
  const md = forge.md.sha256.create();
  md.update(canonicalJson, "utf8");
  return cert.publicKey.verify(md.digest().getBytes(), p7.rawCapture.signature);
}

function signOrderRecord(order) {
  const { privateKeyPem, certPem } = loadSigningMaterial();
  const payload = buildPayload(order);
  const canonical = payloadCanonicalJson(payload);
  const { pem, payloadHash, signedAt } = signPayloadCanonical(canonical, privateKeyPem, certPem);
  return {
    nrPayloadHash: payloadHash,
    nrPkcs7Signature: pem,
    nrSignedAt: signedAt,
    nrSignatureVersion: SIGNATURE_VERSION,
    payload,
    canonical,
  };
}

function verifyOrderRecord(order) {
  if (!order.nrPkcs7Signature || !order.nrPayloadHash) {
    return { valid: false, reason: "MISSING_SIGNATURE" };
  }
  const { certPem } = loadSigningMaterial();
  const payload = buildPayload(order);
  const canonical = payloadCanonicalJson(payload);
  const hashOk =
    crypto.createHash("sha256").update(canonical, "utf8").digest("hex") === order.nrPayloadHash;
  if (!hashOk) {
    return { valid: false, reason: "PAYLOAD_TAMPERED" };
  }
  const sigOk = verifyPkcs7Signature(canonical, order.nrPkcs7Signature, certPem);
  return { valid: sigOk && hashOk, reason: sigOk ? "OK" : "INVALID_PKCS7" };
}

async function persistOrderNonRepudiation(supabase, order) {
  const signed = signOrderRecord(order);
  const { error } = await supabase
    .from("pedidos")
    .update({
      nrPayloadHash: signed.nrPayloadHash,
      nrPkcs7Signature: signed.nrPkcs7Signature,
      nrSignedAt: signed.nrSignedAt,
      nrSignatureVersion: signed.nrSignatureVersion,
    })
    .eq("id", order.id);
  if (error) throw new Error(error.message);
  return signed;
}

module.exports = {
  buildPayload,
  signOrderRecord,
  verifyOrderRecord,
  persistOrderNonRepudiation,
  loadSigningMaterial,
  SIGNATURE_VERSION,
};
