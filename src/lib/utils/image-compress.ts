export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

const MAX_RAW_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB batas file mentah sebelum kompresi
const MAX_SERVER_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB sesuai limit bucket Supabase
const MAX_DIMENSION_PX = 1600;
const WEBP_QUALITY = 0.82;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImageElement(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export async function prepareAttachmentFile(inputFile: File): Promise<CompressionResult> {
  if (inputFile.size > MAX_RAW_INPUT_BYTES) {
    throw new Error('Ukuran file terlalu besar (maksimal 15 MB sebelum kompresi).');
  }

  if (inputFile.type === 'application/pdf') {
    if (inputFile.size > MAX_SERVER_UPLOAD_BYTES) {
      throw new Error('Ukuran file PDF maksimal 5 MB.');
    }
    return {
      file: inputFile,
      originalSize: inputFile.size,
      compressedSize: inputFile.size,
      wasCompressed: false,
    };
  }

  if (!inputFile.type.startsWith('image/')) {
    throw new Error('Format tidak didukung. Unggah foto (JPG/PNG/WebP) atau dokumen PDF.');
  }

  const objectUrl = URL.createObjectURL(inputFile);

  try {
    const img = await loadImageElement(objectUrl);

    let targetWidth = img.naturalWidth;
    let targetHeight = img.naturalHeight;

    if (targetWidth > MAX_DIMENSION_PX || targetHeight > MAX_DIMENSION_PX) {
      const scale = Math.min(MAX_DIMENSION_PX / targetWidth, MAX_DIMENSION_PX / targetHeight);
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    let blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
    let outputMime = 'image/webp';
    let outputExt = 'webp';

    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
      outputMime = 'image/jpeg';
      outputExt = 'jpg';
    }

    if (!blob) throw new Error('Gagal mengompresi gambar.');

    const isOriginalAllowed = ['image/webp', 'image/jpeg', 'image/png'].includes(inputFile.type);
    if (blob.size >= inputFile.size && isOriginalAllowed && inputFile.size <= MAX_SERVER_UPLOAD_BYTES) {
      return {
        file: inputFile,
        originalSize: inputFile.size,
        compressedSize: inputFile.size,
        wasCompressed: false,
      };
    }

    if (blob.size > MAX_SERVER_UPLOAD_BYTES) {
      throw new Error('Gambar masih melebihi 5 MB setelah dikompresi. Coba potong bagian yang tidak perlu.');
    }

    const baseName = inputFile.name.replace(/\.[^/.]+$/, '');
    const compressedFile = new File([blob], `${baseName}.${outputExt}`, {
      type: outputMime,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize: inputFile.size,
      compressedSize: compressedFile.size,
      wasCompressed: true,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
