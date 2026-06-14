"use client";

/**
 * Client-side image compressor used by peserta evidence uploads.
 * - JPG/PNG/WEBP/HEIC inputs are resized to max 1920px on the long edge
 *   and re-encoded as JPEG quality 0.82 (~70% size reduction typical).
 * - Files already < 500KB are passed through untouched (compression
 *   would not save meaningful storage).
 * - Non-image files (PDF/video/audio/etc) are passed through untouched.
 */

const MAX_EDGE = 1920;
const QUALITY = 0.82;
const SKIP_BELOW = 500 * 1024;

export async function compressIfImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < SKIP_BELOW) return file;
  // Skip GIF / SVG — they'd lose animation / vector quality
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const { width, height } = scaleToFit(
        img.naturalWidth,
        img.naturalHeight,
        MAX_EDGE,
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, width, height);
      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", QUALITY),
      );
      if (!blob || blob.size >= file.size) return file;
      const newName = file.name.replace(/\.(png|webp|heic|heif|bmp|tiff?)$/i, ".jpg");
      return new File([blob], newName, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return file;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function scaleToFit(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = Math.min(max / w, max / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
