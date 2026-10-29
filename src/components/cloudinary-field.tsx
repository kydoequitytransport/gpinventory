"use client";

import { useEffect, useState } from "react";

const maxBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function CloudinaryField({
  name,
  kind,
  currentUrl,
  shape = "tile",
  holdUntilSave = false,
}: {
  name: string;
  kind: "product" | "category";
  currentUrl: string;
  shape?: "tile" | "circle";
  holdUntilSave?: boolean;
}) {
  const [url, setUrl] = useState(currentUrl);
  const [preview, setPreview] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!preview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      setError("Use a JPEG, PNG, WebP, or GIF.");
      setPreview("");
      return;
    }
    if (file.size <= 0 || file.size > maxBytes) {
      setError("Keep the image at 5 MB or smaller.");
      setPreview("");
      return;
    }

    if (holdUntilSave) {
      setError("");
      setPreview(URL.createObjectURL(file));
      return;
    }

    setPending(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    try {
      const response = await fetch("/api/cloudinary", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        setError(payload?.error || "The image did not upload.");
        return;
      }
      setUrl(payload.url);
      setPreview("");
    } catch {
      setError("The image did not upload.");
    } finally {
      setPending(false);
    }
  }

  const shown = preview || url;

  return (
    <div className={shape === "circle" ? "grid justify-items-start gap-2" : "grid gap-2"}>
      <input type="hidden" name={name} value={url} />
      {shown ? (
        // Preview may be a local blob, or a Cloudinary delivery URL after save.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shown}
          alt=""
          className={
            shape === "circle" ? "h-12 w-12 rounded-full object-cover" : "h-28 w-20 rounded-xl object-cover"
          }
        />
      ) : (
        <div
          className={
            shape === "circle"
              ? "flex h-12 w-12 items-center justify-center rounded-full bg-paper-deep text-[10px] text-muted"
              : "flex h-28 w-20 items-center justify-center rounded-xl bg-paper-deep text-[10px] text-muted"
          }
        >
          {shape === "circle" ? "50 x 50" : "80 x 110"}
        </div>
      )}
      <label className="inline-flex h-11 cursor-pointer items-center rounded-2xl border border-line bg-white px-3 text-sm text-ink hover:border-copper">
        <input
          type="file"
          name={holdUntilSave ? "image" : undefined}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const rejected = !allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes;
            if (!holdUntilSave || rejected) event.target.value = "";
            void onFile(file);
          }}
        />
        {pending ? "Uploading…" : holdUntilSave ? "Choose image" : "Upload"}
      </label>
      {error ? <p className="max-w-xs text-xs leading-5 text-danger">{error}</p> : null}
    </div>
  );
}
