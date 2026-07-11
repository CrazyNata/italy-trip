// Warm colour grade for the Mapbox Standard "Warm" gallery look — a cube-strip
// LUT (N blue-slices wide, red on x, green on y) applied as a custom theme.
// Light + soft warm grade: gentle desaturation, lifted (airy) tones, red
// slightly warmer than blue, so land reads pale sage and water stays bright.
let warmLutCache: string | null = null;

export function warmLut(): string {
  if (warmLutCache) return warmLutCache;
  const N = 32;
  const canvas = document.createElement("canvas");
  canvas.width = N * N;
  canvas.height = N;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(N * N, N);
  const d = img.data;
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let b = 0; b < N; b++)
    for (let g = 0; g < N; g++)
      for (let r = 0; r < N; r++) {
        const x = b * N + r;
        const i = (g * N * N + x) * 4;
        const R = (r / (N - 1)) * 255;
        const G = (g / (N - 1)) * 255;
        const B = (b / (N - 1)) * 255;
        const lum = 0.3 * R + 0.59 * G + 0.11 * B;
        const s = 0.9;
        d[i] = clamp((lum + (R - lum) * s) * 0.93 + 20);
        d[i + 1] = clamp((lum + (G - lum) * s) * 0.94 + 16);
        d[i + 2] = clamp((lum + (B - lum) * s) * 0.95 + 12);
        d[i + 3] = 255;
      }
  ctx.putImageData(img, 0, 0);
  warmLutCache = canvas.toDataURL("image/png").split(",")[1];
  return warmLutCache;
}

// Shared basemap options so every map uses the same warm Standard theme.
export const WARM_STYLE = "mapbox://styles/mapbox/standard";
export const warmConfig = () => ({ basemap: { theme: "custom", "theme-data": warmLut() } });
