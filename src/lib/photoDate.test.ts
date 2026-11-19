import { describe, expect, it } from 'vitest';
import { dayInputToDate, parseExifDate, parseExifDateTime, readPhotoDate, toDayInput } from './photoDate';

/** A minimal JPEG: SOI, then an APP1 Exif segment with the given tags, then start of scan. */
function jpegWithExif({ original, modified, little = true }: { original?: string; modified?: string; little?: boolean }) {
  const bytes: number[] = [];
  const u16 = (n: number) => (little ? [n & 0xff, n >> 8] : [n >> 8, n & 0xff]);
  const u32 = (n: number) => (little ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24] : [n >>> 24, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
  const str = (s: string) => [...s].map((c) => c.charCodeAt(0));

  // TIFF: header (8) · IFD0 at 8 · Exif IFD after it · strings after that.
  const ifd0Entries = (modified ? 1 : 0) + 1;
  const ifd0Size = 2 + ifd0Entries * 12 + 4;
  const exifIfd = 8 + ifd0Size;
  const exifSize = 2 + (original ? 1 : 0) * 12 + 4;
  let strings = exifIfd + exifSize;
  const tiff: number[] = [...str(little ? 'II' : 'MM'), ...u16(42), ...u32(8)];
  const tail: number[] = [];
  const asciiEntry = (tag: number, s: string) => {
    const at = strings;
    const value = [...str(s), 0];
    tail.push(...value);
    strings += value.length;
    return [...u16(tag), ...u16(2), ...u32(value.length), ...u32(at)];
  };
  const ifd0: number[] = [...u16(ifd0Entries)];
  if (modified) ifd0.push(...asciiEntry(0x0132, modified));
  ifd0.push(...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifIfd), ...u32(0));
  const exif: number[] = [...u16(original ? 1 : 0)];
  if (original) exif.push(...asciiEntry(0x9003, original));
  exif.push(...u32(0));
  tiff.push(...ifd0, ...exif, ...tail);

  const app1 = [...str('Exif'), 0, 0, ...tiff];
  bytes.push(0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 0xff, ...app1, 0xff, 0xda, 0, 2);
  return new Uint8Array(bytes).buffer;
}

describe('parseExifDate', () => {
  it('reads when the photo was taken, as local time', () => {
    const date = parseExifDate(jpegWithExif({ original: '2026:11:12 19:04:31', modified: '2026:11:15 08:00:00' }))!;
    expect(date).toEqual(new Date(2026, 10, 12, 19, 4, 31));
  });

  it('reads big-endian EXIF too', () => {
    expect(parseExifDate(jpegWithExif({ original: '2026:03:01 12:30:00', little: false }))).toEqual(new Date(2026, 2, 1, 12, 30, 0));
  });

  it('falls back to the file date when there is no capture date', () => {
    expect(parseExifDate(jpegWithExif({ modified: '2026:11:15 08:00:00' }))).toEqual(new Date(2026, 10, 15, 8, 0, 0));
  });

  it('gives up on files without EXIF', () => {
    expect(parseExifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeUndefined();
    expect(parseExifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeUndefined();
  });

  it('reads a File', async () => {
    const file = new File([jpegWithExif({ original: '2026:11:12 19:04:31' })], 'p.jpg', { type: 'image/jpeg' });
    expect(await readPhotoDate(file)).toEqual(new Date(2026, 10, 12, 19, 4, 31));
  });
});

describe('date helpers', () => {
  it('rejects blank or impossible EXIF dates', () => {
    expect(parseExifDateTime('0000:00:00 00:00:00')).toBeUndefined();
    expect(parseExifDateTime('')).toBeUndefined();
  });

  it('round-trips a day through the date input format', () => {
    expect(toDayInput(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayInputToDate('2026-01-05')).toEqual(new Date(2026, 0, 5, 12));
    expect(dayInputToDate('nope')).toBeUndefined();
  });
});
