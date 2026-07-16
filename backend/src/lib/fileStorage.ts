import { del, put } from '@vercel/blob';

const BLOB_HOST = 'blob.vercel-storage.com';

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 120) || 'file';
}

function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

export function isRemoteFileUrl(url: string | null | undefined): boolean {
  return Boolean(url && !isDataUrl(url) && url.includes('://'));
}

/** Upload therapy resource file to Vercel Blob (free tier). Returns a public HTTPS URL. */
export async function uploadResourceFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const onVercel = Boolean(process.env.VERCEL);
  if (!token && !onVercel) {
    throw new Error(
      'File storage is not configured. In Vercel: Storage → Blob → connect a store to the helixacareai backend project.'
    );
  }

  const pathname = `resources/${Date.now()}-${sanitizeFileName(fileName)}`;
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: mimeType || 'application/octet-stream',
    addRandomSuffix: true,
    ...(token ? { token } : {}),
  });

  return blob.url;
}

/** Remove a file from Vercel Blob when a resource is deleted. */
export async function deleteStoredFile(url: string | null | undefined): Promise<void> {
  if (!url || isDataUrl(url) || !url.includes(BLOB_HOST)) return;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  try {
    await del(url, { token });
  } catch (err) {
    console.error('[fileStorage] delete failed:', err);
  }
}
