import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { signCloudinaryParams, buildCloudinaryUploadSignature } = require("../../bff/cloudinarySign.cjs");

describe("Interoperabilidad — firma Cloudinary upload", () => {
  it("signCloudinaryParams es determinista con parámetros ordenados", () => {
    const sig1 = signCloudinaryParams({ folder: "calzatura", timestamp: 1_700_000_000 }, "secret-test");
    const sig2 = signCloudinaryParams({ timestamp: 1_700_000_000, folder: "calzatura" }, "secret-test");
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{40}$/);
  });

  it("buildCloudinaryUploadSignature falla cerrado sin credenciales", () => {
    const prev = {
      cloud: process.env.CLOUDINARY_CLOUD_NAME,
      key: process.env.CLOUDINARY_API_KEY,
      secret: process.env.CLOUDINARY_API_SECRET,
    };
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    expect(() => buildCloudinaryUploadSignature()).toThrow(/Cloudinary no configurado/i);

    if (prev.cloud) process.env.CLOUDINARY_CLOUD_NAME = prev.cloud;
    if (prev.key) process.env.CLOUDINARY_API_KEY = prev.key;
    if (prev.secret) process.env.CLOUDINARY_API_SECRET = prev.secret;
  });

  it("buildCloudinaryUploadSignature devuelve contrato esperado por widget upload", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "123456789012345";
    process.env.CLOUDINARY_API_SECRET = "secret-demo";

    const payload = buildCloudinaryUploadSignature({ folder: "calzatura/products" });

    expect(payload).toMatchObject({
      cloudName: "demo",
      apiKey: "123456789012345",
      folder: "calzatura/products",
    });
    expect(typeof payload.timestamp).toBe("number");
    expect(payload.signature).toMatch(/^[a-f0-9]{40}$/);
  });
});
