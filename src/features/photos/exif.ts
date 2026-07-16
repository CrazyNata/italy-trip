// Разбор EXIF и уменьшение изображения перед загрузкой в хранилище.
// Из EXIF нужны только дата съёмки и GPS-координаты — по ним фото само
// раскладывается по городам в альбоме.

export interface ExifData {
  iso?: string;
  lat?: number;
  lng?: number;
}

export function exif(buf: ArrayBuffer): ExifData {
  try {
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xffd8) return {};
    let o = 2;
    while (o < v.byteLength) {
      if (v.getUint16(o) !== 0xffe1) {
        o += 2 + v.getUint16(o + 2);
        continue;
      }
      if (v.getUint32(o + 4) !== 0x45786966) return {};
      const t = o + 10;
      const le = v.getUint16(t) === 0x4949;
      const u16 = (x: number) => v.getUint16(x, le);
      const u32 = (x: number) => v.getUint32(x, le);
      const ifd = t + u32(t + 4);
      let gp = 0;
      let ep = 0;
      for (let i = 0; i < u16(ifd); i += 1) {
        const e = ifd + 2 + i * 12;
        const tag = u16(e);
        if (tag === 0x8825) gp = t + u32(e + 8);
        if (tag === 0x8769) ep = t + u32(e + 8);
      }
      let iso: string | undefined;
      let lat: number | undefined;
      let lng: number | undefined;
      if (ep) {
        for (let i = 0; i < u16(ep); i += 1) {
          const e = ep + 2 + i * 12;
          const tag = u16(e);
          const n = u32(e + 4);
          const p = n > 4 ? t + u32(e + 8) : e + 8;
          if ([0x9003, 0x9004, 0x132].includes(tag)) {
            let value = "";
            for (let k = 0; k < n - 1; k += 1) value += String.fromCharCode(v.getUint8(p + k));
            const match = value.match(/(\d{4})\D(\d{2})\D(\d{2})/);
            if (!iso && match) iso = `${match[1]}-${match[2]}-${match[3]}`;
          }
        }
      }
      if (gp) {
        let latRef = "N";
        let lngRef = "E";
        let latValue: number | undefined;
        let lngValue: number | undefined;
        const rational = (p: number) => {
          let value = 0;
          for (let k = 0; k < 3; k += 1)
            value += u32(p + k * 8) / (u32(p + k * 8 + 4) || 1) / (k ? 60 ** k : 1);
          return value;
        };
        for (let i = 0; i < u16(gp); i += 1) {
          const e = gp + 2 + i * 12;
          const tag = u16(e);
          const p = t + u32(e + 8);
          if (tag === 1) latRef = String.fromCharCode(v.getUint8(e + 8));
          if (tag === 3) lngRef = String.fromCharCode(v.getUint8(e + 8));
          if (tag === 2) latValue = rational(p);
          if (tag === 4) lngValue = rational(p);
        }
        if (latValue != null) lat = latRef === "S" ? -latValue : latValue;
        if (lngValue != null) lng = lngRef === "W" ? -lngValue : lngValue;
      }
      return { iso, lat, lng };
    }
  } catch {
    // Битый или неполный EXIF считаем отсутствующими метаданными.
  }
  return {};
}

// Ужимает фото до разумного размера перед загрузкой, чтобы альбом с десятками
// снимков не тянул многомегабайтные оригиналы. При ошибке возвращает null —
// вызывающий код тогда грузит исходный файл.
export function scaleToBlob(file: File, max = 1600, quality = 0.82) {
  return new Promise<Blob | null>((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    const finish = (value: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    image.onload = () => {
      try {
        const ratio = Math.min(1, max / image.width, max / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext("2d");
        if (!context) return finish(null);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), "image/jpeg", quality);
      } catch {
        finish(null);
      }
    };
    image.onerror = () => finish(null);
    image.src = url;
  });
}
