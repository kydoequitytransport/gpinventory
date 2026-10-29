import { createHash } from "node:crypto";
import { cloudinaryUrl } from "@/lib/cloudinary";

const maxBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function uploadCatalogImage(
  file: File,
  folder: string,
): Promise<{ url: string } | { error: string }> {
  if (!allowedTypes.has(file.type)) {
    return { error: "Use a JPEG, PNG, WebP, or GIF." };
  }
  if (file.size <= 0 || file.size > maxBytes) {
    return { error: "Keep the image at 5 MB or smaller." };
  }

  const account = cloudinaryAccount();
  if (!account) {
    return { error: "Cloudinary is not set up yet. Replace the example keys in .env.local." };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { folder, timestamp };
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", account.key);
  body.set("timestamp", timestamp);
  body.set("folder", folder);
  body.set("signature", sign(params, account.secret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${account.cloud}/image/upload`, {
    method: "POST",
    body,
  });
  const payload = (await response.json().catch(() => null)) as {
    secure_url?: string;
    error?: { message?: string };
  } | null;

  const url = payload?.secure_url ? cloudinaryUrl(payload.secure_url) : null;
  if (!response.ok || !url) {
    return { error: payload?.error?.message || "Cloudinary did not accept the image." };
  }

  return { url };
}

function cloudinaryAccount() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const key = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const secret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  if (!cloud || !key || !secret) return null;
  if ([cloud, key, secret].some((value) => value.startsWith("your-"))) return null;
  return { cloud, key, secret };
}

function sign(params: Record<string, string>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}
