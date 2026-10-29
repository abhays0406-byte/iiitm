/** A paper slip read from a file and ready to store: images are downscaled, PDFs kept as-is. */
export interface SlipFile {
  name: string;
  type: string;
  size: number;
  data_url: string;
}

export const SLIP_ACCEPT = 'image/*,application/pdf';
const MAX_IMAGE_EDGE = 1400;
const JPEG_QUALITY = 0.72;
// Slips live in browser storage (about 5 MB per site), so PDFs are capped.
const MAX_PDF_BYTES = 1.5 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This image could not be opened.'));
    img.src = src;
  });
}

/** Reads a photo or PDF of a paper slip. Throws an Error with a user-facing message when it cannot be used. */
export async function readSlipFile(file: File): Promise<SlipFile> {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error('PDF is larger than 1.5 MB. Attach a photo of the slip instead.');
    return { name: file.name, type: file.type, size: file.size, data_url: await readAsDataUrl(file) };
  }
  if (!file.type.startsWith('image/')) throw new Error('Attach a photo (JPG, PNG) or a PDF of the slip.');

  const img = await loadImage(await readAsDataUrl(file));
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data_url = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const size = Math.round((data_url.length - data_url.indexOf(',') - 1) * 0.75);
  return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', size, data_url };
}

/** Opens a stored data URL in a new tab (browsers block top-level data: URLs, so go through a blob URL). */
export function openSlipInNewTab(dataUrl: string) {
  const [head, body] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
