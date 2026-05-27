"use strict";

const crypto = require("crypto");

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}

function hashIp(ip) {
  const salt = process.env.SECURITY_IP_HASH_SALT?.trim() || "";
  return crypto
    .createHash("sha256")
    .update(salt)
    .update("|")
    .update(String(ip))
    .digest("hex")
    .slice(0, 24);
}

module.exports = {
  getClientIp,
  hashIp,
};
