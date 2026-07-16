import { supabase } from "../../lib/supabase/client";
import type { PhotoPreview, TripData } from "../../types/trip";

const BUCKET = "place-photos";
const storageBase = new URL(supabase.storage.from(BUCKET).getPublicUrl("__probe__").data.publicUrl);
const storagePrefix = storageBase.pathname.slice(0, -"__probe__".length);

export function photoPreviewUrl(data: TripData, fullUrl: string) {
  return data.photoPreviews?.[fullUrl]?.url ?? fullUrl;
}

export function storagePath(url: string) {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin === storageBase.origin && parsed.pathname.startsWith(storagePrefix)
      ? decodeURIComponent(parsed.pathname.slice(storagePrefix.length))
      : "";
  } catch {
    return "";
  }
}

function canvasBlob(source: CanvasImageSource, width: number, height: number, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return reject(new Error("Canvas is unavailable"));
    context.drawImage(source, 0, 0, width, height);
    canvas.toBlob((blob) => {
      canvas.width = 0;
      canvas.height = 0;
      if (blob) resolve(blob);
      else reject(new Error("Image encoding failed"));
    }, "image/jpeg", quality);
  });
}

function dimensions(width: number, height: number, max: number) {
  const ratio = Math.min(1, max / width, max / height);
  return [Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio))] as const;
}

export async function createImageVariants(source: Blob) {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  try {
    const [largeWidth, largeHeight] = dimensions(bitmap.width, bitmap.height, 1600);
    const [thumbWidth, thumbHeight] = dimensions(bitmap.width, bitmap.height, 400);
    const large = await canvasBlob(bitmap, largeWidth, largeHeight, 0.82);
    const thumbnail = await canvasBlob(bitmap, thumbWidth, thumbHeight, 0.76);
    return { large, thumbnail };
  } finally {
    bitmap.close();
  }
}

export async function createThumbnail(source: Blob) {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  try {
    const [width, height] = dimensions(bitmap.width, bitmap.height, 400);
    return await canvasBlob(bitmap, width, height, 0.76);
  } finally {
    bitmap.close();
  }
}

export async function uploadImageVariants(source: Blob, basePath: string) {
  const { large, thumbnail } = await createImageVariants(source);
  const fullPath = `${basePath}/large.jpg`;
  const thumbnailPath = `${basePath}/thumb.jpg`;
  const uploaded: string[] = [];
  try {
    const fullResult = await supabase.storage.from(BUCKET).upload(fullPath, large, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false,
    });
    if (fullResult.error) throw fullResult.error;
    uploaded.push(fullPath);
    const thumbnailResult = await supabase.storage.from(BUCKET).upload(thumbnailPath, thumbnail, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false,
    });
    if (thumbnailResult.error) throw thumbnailResult.error;
    uploaded.push(thumbnailPath);
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
    throw error;
  }
  const bucket = supabase.storage.from(BUCKET);
  return {
    fullUrl: bucket.getPublicUrl(fullPath).data.publicUrl,
    fullPath,
    preview: {
      url: bucket.getPublicUrl(thumbnailPath).data.publicUrl,
      path: thumbnailPath,
    } satisfies PhotoPreview,
  };
}

export async function removePhotoObjects(fullUrls: string[], previews?: Record<string, PhotoPreview>) {
  const paths = new Set<string>();
  fullUrls.forEach((url) => {
    const fullPath = storagePath(url);
    if (fullPath) paths.add(fullPath);
    const previewPath = previews?.[url]?.path;
    if (previewPath) paths.add(previewPath);
  });
  if (!paths.size) return null;
  const { error } = await supabase.storage.from(BUCKET).remove([...paths]);
  return error;
}

export function omitPhotoPreviews(previews: Record<string, PhotoPreview> | undefined, fullUrls: string[]) {
  if (!previews) return undefined;
  const next = { ...previews };
  fullUrls.forEach((url) => delete next[url]);
  return next;
}

export async function thumbnailPath(fullUrl: string) {
  const bytes = new TextEncoder().encode(fullUrl);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `thumbnails/v1/${hash}.jpg`;
}

export async function uploadMigratedThumbnail(fullUrl: string, blob: Blob) {
  const path = await thumbnailPath(fullUrl);
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: "31536000",
    contentType: "image/jpeg",
    upsert: false,
  });
  const status = error && "statusCode" in error ? String(error.statusCode) : "";
  if (error && status !== "409") throw error;
  return {
    url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
    path,
  } satisfies PhotoPreview;
}
