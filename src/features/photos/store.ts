export type Photo = {
  id: string;
  thumb: string;
  iso: string | null;
  lat: number | null;
  lng: number | null;
  place: string | null;
};

let databasePromise: Promise<IDBDatabase> | null = null;
let storeSession = 0;

function database(session: number) {
  if (session !== storeSession) return Promise.reject(new Error("Photo store session closed"));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("italy_photos_db", 4);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "id" });
        return;
      }
      if (request.transaction?.objectStore("photos").keyPath !== "id") {
        const read = request.transaction!.objectStore("photos").getAll();
        read.onsuccess = () => {
          const records = read.result as Photo[];
          db.deleteObjectStore("photos");
          const store = db.createObjectStore("photos", { keyPath: "id" });
          for (const photo of records) {
            store.put({
              id: photo.id,
              thumb: photo.thumb,
              iso: photo.iso ?? null,
              lat: photo.lat ?? null,
              lng: photo.lng ?? null,
              place: photo.place ?? null,
            });
          }
        };
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        databasePromise = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("Photo database is blocked"));
    };
  });
  return databasePromise;
}

export function openPhotoStore() {
  storeSession += 1;
  return storeSession;
}

export function closePhotoStore(session: number) {
  if (session !== storeSession) return;
  storeSession += 1;
  const openDatabase = databasePromise;
  databasePromise = null;
  void openDatabase?.then((db) => db.close()).catch(() => undefined);
}

export async function all(session: number) {
  const db = await database(session);
  if (session !== storeSession) throw new Error("Photo store session closed");
  return new Promise<Photo[]>((resolve, reject) => {
    const request = db.transaction("photos").objectStore("photos").getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function put(session: number, photo: Photo) {
  const db = await database(session);
  if (session !== storeSession) throw new Error("Photo store session closed");
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    transaction.objectStore("photos").put(photo);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function del(session: number, id: string) {
  const db = await database(session);
  if (session !== storeSession) throw new Error("Photo store session closed");
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("photos", "readwrite");
    transaction.objectStore("photos").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function exif(buf: ArrayBuffer) {
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
      let iso: string | null = null;
      let lat: number | null = null;
      let lng: number | null = null;
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
        let latValue: number | null = null;
        let lngValue: number | null = null;
        const rational = (p: number) => {
          let value = 0;
          for (let k = 0; k < 3; k += 1) value += u32(p + k * 8) / (u32(p + k * 8 + 4) || 1) / (k ? 60 ** k : 1);
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
    // Invalid or truncated EXIF is treated as missing metadata.
  }
  return {};
}

export function scale(file: File) {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    const finish = (value: string | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    image.onload = () => {
      try {
        const ratio = Math.min(1, 1400 / image.width, 1400 / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext("2d");
        if (!context) return finish(null);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        finish(null);
      }
    };
    image.onerror = () => finish(null);
    image.src = url;
  });
}
