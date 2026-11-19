/**
 * When a photo was taken, from its EXIF data, so logging a dish later can use the day you
 * were actually there. Reads only the start of the file, and must run on the original file:
 * resizing re-encodes the image and drops EXIF.
 */

/** EXIF lives in the first APP1 segment, near the start of a JPEG. */
const HEAD_BYTES = 256 * 1024;

const TAG_DATETIME = 0x0132; // IFD0: when the file was last changed
const TAG_EXIF_IFD = 0x8769; // IFD0: pointer to the Exif sub-IFD
const TAG_DATETIME_ORIGINAL = 0x9003; // Exif IFD: when the photo was taken

/** Local time in the photo, or undefined if the file has no usable EXIF date. */
export async function readPhotoDate(file: Blob): Promise<Date | undefined> {
  try {
    return parseExifDate(await file.slice(0, HEAD_BYTES).arrayBuffer());
  } catch {
    return undefined;
  }
}

export function parseExifDate(buffer: ArrayBuffer): Date | undefined {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return undefined; // not a JPEG

  // Walk the JPEG segments to the Exif APP1 segment.
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return undefined; // image data: no EXIF before it
    const length = view.getUint16(offset + 2);
    if (marker === 0xffe1 && ascii(view, offset + 4, 6) === 'Exif\0\0') return readTiff(view, offset + 10);
    offset += 2 + length;
  }
  return undefined;
}

function readTiff(view: DataView, start: number): Date | undefined {
  const order = ascii(view, start, 2);
  if (order !== 'II' && order !== 'MM') return undefined;
  const little = order === 'II';
  const u16 = (at: number) => view.getUint16(start + at, little);
  const u32 = (at: number) => view.getUint32(start + at, little);

  /** Look up `tag` in the IFD at `ifd` (relative to the TIFF header): its value or value offset. */
  const find = (ifd: number, tag: number): { count: number; value: number } | undefined => {
    const entries = u16(ifd);
    for (let i = 0; i < entries; i++) {
      const entry = ifd + 2 + i * 12;
      if (u16(entry) === tag) return { count: u32(entry + 4), value: u32(entry + 8) };
    }
    return undefined;
  };
  const text = (e: { count: number; value: number } | undefined) =>
    e ? parseExifDateTime(ascii(view, start + e.value, Math.min(e.count, 32))) : undefined;

  const ifd0 = u32(4);
  const exifPointer = find(ifd0, TAG_EXIF_IFD);
  const original = exifPointer ? text(find(exifPointer.value, TAG_DATETIME_ORIGINAL)) : undefined;
  return original ?? text(find(ifd0, TAG_DATETIME));
}

/** "2026:11:12 19:04:31" → that time, read as local time (EXIF has no time zone here). */
export function parseExifDateTime(value: string): Date | undefined {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!m) return undefined;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  const date = new Date(y, mo - 1, d, h, mi, s);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function ascii(view: DataView, at: number, length: number): string {
  let out = '';
  for (let i = 0; i < length && at + i < view.byteLength; i++) out += String.fromCharCode(view.getUint8(at + i));
  return out;
}

/** "2026-11-12" for a date input, in local time. */
export function toDayInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The local noon of a "2026-11-12" day, which stays on that day in any time zone shift. */
export function dayInputToDate(day: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return undefined;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
