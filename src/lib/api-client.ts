import { ApiResponse, ImageMeta } from "../../shared/types"
/**
 * Enhanced API utility that handles versioning and categorizes errors.
 * It automatically prepends /api/v1 if the path doesn't start with it.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('/api/v1/') ? path : path.replace('/api/', '/api/v1/');
  const targetUrl = new URL(normalizedPath, window.location.origin).toString();
  try {
    // Only set Content-Type to JSON when body is not FormData (which needs browser-set boundary)
    const autoHeaders: Record<string, string> = {};
    if (!(init?.body instanceof FormData)) {
      autoHeaders['Content-Type'] = 'application/json';
    }
    const res = await fetch(targetUrl, {
      ...init,
      headers: {
        ...autoHeaders,
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      if (res.status === 404) {
        // Log as warning for known resource issues rather than full error crash
        console.warn(`[API 404] Resource not found: ${normalizedPath}`);
        throw new Error(`Resource not found: ${normalizedPath}`);
      }
      const errorText = await res.text().catch(() => 'No error detail available');
      const errorMsg = `Server returned status ${res.status}: ${errorText}`;
      console.error(`[API CRITICAL] ${errorMsg} at ${normalizedPath}`);
      throw new Error(errorMsg);
    }
    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success || json.data === undefined) {
      const errorMessage = json.error || 'Request returned unsuccessful status';
      console.warn(`[API REJECTED] ${errorMessage} at ${normalizedPath}`);
      throw new Error(errorMessage);
    }
    return json.data;
  } catch (err) {
    // Distinguish between common 404s and real network/syntax errors
    if (err instanceof Error) {
      if (!err.message.includes('not found')) {
        console.error(`[API FETCH FAILED] ${normalizedPath}`, {
          message: err.message,
          stack: err.stack
        });
      }
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  Image-specific helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Upload an image file via multipart/form-data.
 * Returns the stored image metadata including its serving URL.
 */
export async function uploadImage(file: File): Promise<ImageMeta> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/v1/images', { method: 'POST', body: form });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Upload failed');
    let msg = 'Upload failed';
    try {
      const json = JSON.parse(text);
      msg = json.error || msg;
    } catch {
      msg = text;
    }
    throw new Error(msg);
  }

  const json = (await res.json()) as ApiResponse<ImageMeta>;
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Upload returned unsuccessful status');
  }
  return json.data;
}

/** Fetch the list of all uploaded images. */
export async function fetchImages(): Promise<ImageMeta[]> {
  return api<ImageMeta[]>('/api/v1/images');
}

/** Delete an image by ID. */
export async function deleteImage(id: string): Promise<void> {
  await api(`/api/v1/images/${id}`, { method: 'DELETE' });
}

/** Build the serving URL for an image ID. */
export function imageUrl(id: string): string {
  return `/api/v1/images/${id}`;
}

/**
 * Strip markdown-special characters from a filename to produce safe alt text.
 * Prevents markdown injection via crafted filenames.
 */
export function safeAlt(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')             // strip extension
    .replace(/[[\]()\n\r\\!`]/g, '')     // strip markdown-special chars
    .trim() || 'image';
}