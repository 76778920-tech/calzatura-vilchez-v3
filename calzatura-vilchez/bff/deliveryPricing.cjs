/**
 * Tarifa de envío (misma lógica que quoteFromDistanceKm en deliveryOpenRoute.ts).
 */
const { drivingDistanceKm } = require("./delivery.cjs");

function parseEnvNumber(...names) {
  for (const name of names) {
    const raw = process.env[name];
    if (raw == null || String(raw).trim() === "") continue;
    const n = Number(String(raw).trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function getDeliveryConfigFromEnv() {
  return {
    basePrice: parseEnvNumber("DELIVERY_BASE_PRICE", "VITE_DELIVERY_BASE_PRICE") ?? 3,
    pricePerKm: parseEnvNumber("DELIVERY_PRICE_PER_KM", "VITE_DELIVERY_PRICE_PER_KM") ?? 2,
    maxFreeDistanceKm: parseEnvNumber("DELIVERY_FREE_KM", "VITE_DELIVERY_FREE_KM") ?? 2,
    maxDeliveryKm: parseEnvNumber("DELIVERY_MAX_KM", "VITE_DELIVERY_MAX_KM") ?? 15,
    storeLat: parseEnvNumber("STORE_LAT", "VITE_STORE_LAT") ?? -12.071054,
    storeLng: parseEnvNumber("STORE_LNG", "VITE_STORE_LNG") ?? -75.205806,
  };
}

/**
 * @param {number} distanceKm
 * @param {{ basePrice: number, pricePerKm: number, maxFreeDistanceKm: number, maxDeliveryKm: number }} config
 */
function computeDeliveryFee(distanceKm, config) {
  const { basePrice, pricePerKm, maxFreeDistanceKm, maxDeliveryKm } = config;
  const isOutOfRange = distanceKm > maxDeliveryKm;
  const isFreeDelivery = distanceKm <= maxFreeDistanceKm;
  let cost = 0;
  if (!isOutOfRange && !isFreeDelivery) {
    const distanceToCharge = Math.max(0, distanceKm - maxFreeDistanceKm);
    cost = basePrice + distanceToCharge * pricePerKm;
    cost = Math.round(cost * 100) / 100;
  }
  return { cost, isOutOfRange, isFreeDelivery, distanceKm };
}

/**
 * @param {number} destLat
 * @param {number} destLng
 * @param {ReturnType<typeof getDeliveryConfigFromEnv>} [config]
 */
async function computeDeliveryFeeFromCoords(destLat, destLng, config) {
  const cfg = config || getDeliveryConfigFromEnv();
  const distanceKm = await drivingDistanceKm(cfg.storeLng, cfg.storeLat, destLng, destLat);
  if (distanceKm == null || !Number.isFinite(distanceKm)) {
    throw new Error("No se pudo calcular la distancia de envio");
  }
  return computeDeliveryFee(distanceKm, cfg);
}

module.exports = {
  computeDeliveryFee,
  computeDeliveryFeeFromCoords,
  getDeliveryConfigFromEnv,
};
