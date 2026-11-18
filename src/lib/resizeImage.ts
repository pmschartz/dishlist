/** Longest side, in pixels, of photos we store. Plenty for a card or a full-screen view. */
export const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/** Scale width/height down so the longest side is at most `max`, keeping the aspect ratio. */
export function scaledSize(width: number, height: number, max = MAX_DIMENSION) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Decode an image file, shrink it to MAX_DIMENSION and re-encode it as JPEG.
 * A 4–8 MB phone photo typically comes out at 200–500 KB.
 */
export async function resizeImage(file: Blob, max = MAX_DIMENSION): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // Browsers apply the photo's EXIF orientation here, so portrait shots stay upright.
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image format isn't supported. Try a JPEG or PNG.");
  }

  const { width, height } = scaledSize(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not process the image.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the image.'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
