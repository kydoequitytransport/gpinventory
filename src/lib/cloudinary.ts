const deliveryHost = "res.cloudinary.com";

export function cloudinaryUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || url.hostname !== deliveryHost) return null;
    if (url.toString().length > 1000) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function cloudinaryFolder(kind: string) {
  if (kind === "category") return "gp-inventory/categories";
  if (kind === "product") return "gp-inventory/products";
  return null;
}
