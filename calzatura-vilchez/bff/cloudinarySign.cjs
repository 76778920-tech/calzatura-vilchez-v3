const crypto = require("crypto");

function signCloudinaryParams(params, apiSecret) {
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
  return crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

function buildCloudinaryUploadSignature(options = {}) {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw Object.assign(new Error("Cloudinary no configurado en el BFF"), { status: 503 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = String(options.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || "calzatura").trim();
  const params = { folder, timestamp };
  const signature = signCloudinaryParams(params, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
  };
}

module.exports = { buildCloudinaryUploadSignature, signCloudinaryParams };
