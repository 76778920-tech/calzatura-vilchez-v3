const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dnenqnvbg";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "calzatura_uploads";
const CLOUDINARY_HOST = "res.cloudinary.com";
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ORIGINAL_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_BYTES = 4 * 1024 * 1024;

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  original_filename?: string;
}

export async function uploadImageToCloudinary(file: Blob, fileName: string): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }
  if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("IMAGE_TYPE_NOT_ALLOWED");
  }
  if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("CLOUDINARY_UPLOAD_FAILED");
  }

  const data = (await response.json()) as CloudinaryUploadResponse;
  if (!data.secure_url) {
    throw new Error("CLOUDINARY_UPLOAD_WITHOUT_URL");
  }

  return normalizeCloudinaryImageUrl(data.secure_url);
}

function cleanUrlValue(value: string) {
  return value.trim().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/^["']|["']$/g, "");
}

function toUrl(value: string) {
  const cleaned = cleanUrlValue(value);
  if (!cleaned) return null;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function isCloudinaryDeliveryUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  const isSharedDeliveryHost = hostname === CLOUDINARY_HOST || /^res-\d+\.cloudinary\.com$/.test(hostname);
  const isCloudSubdomain =
    hostname === `${CLOUDINARY_CLOUD_NAME}.res.cloudinary.com` ||
    hostname === `${CLOUDINARY_CLOUD_NAME}-res.cloudinary.com`;

  if (url.protocol !== "https:") return false;

  if (isSharedDeliveryHost) {
    return Boolean(pathParts[0]) && pathParts[1] === "image" && pathParts[2] === "upload";
  }

  if (isCloudSubdomain) {
    return pathParts[0] === "image" && pathParts[1] === "upload";
  }

  return false;
}

export function normalizeCloudinaryImageUrl(value: string): string {
  const url = toUrl(value);
  if (!url) return cleanUrlValue(value);
  if (isCloudinaryDeliveryUrl(url)) {
    url.protocol = "https:";
    return url.toString();
  }
  return cleanUrlValue(value);
}

export function isCloudinaryImageUrl(value: string): boolean {
  const url = toUrl(value);
  return Boolean(url && isCloudinaryDeliveryUrl(url));
}

export async function compressImageFile(file: File, maxSize = 900, quality = 0.78): Promise<Blob> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Solo se permiten imágenes JPG, PNG o WebP");
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error("La imagen supera el tamaño máximo permitido");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo preparar la imagen"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("No se pudo comprimir la imagen"));
          return;
        }
        resolve(blob);
      }, "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}
