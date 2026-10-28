/**
 * Riduce una foto prima del caricamento: lato lungo massimo 1600 px, formato WebP
 * (JPEG se il browser non lo supporta). Le foto da telefono passano da molti MB a poche centinaia di KB.
 */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<{ blob: Blob; ext: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));

  const webp = await toBlob('image/webp');
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  const jpeg = await toBlob('image/jpeg');
  if (!jpeg) throw new Error('Conversione immagine non riuscita');
  return { blob: jpeg, ext: 'jpg' };
}
