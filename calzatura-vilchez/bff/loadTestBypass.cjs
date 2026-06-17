"use strict";

/** Token compartido BFF ↔ k6; solo activo si LOAD_TEST_TOKEN está definido en el servidor. */
function configuredToken() {
  return String(process.env.LOAD_TEST_TOKEN || "").trim();
}

function isLoadTestBypass(req) {
  const expected = configuredToken();
  if (!expected) return false;
  const received = String(
    req.headers["x-load-test-token"] || req.headers["x-calzatura-load-test-token"] || "",
  ).trim();
  return received.length > 0 && received === expected;
}

module.exports = {
  configuredToken,
  isLoadTestBypass,
};
