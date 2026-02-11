import { ApiResponse } from "../../shared/types"
/**
 * Enhanced API utility that handles versioning and categorizes errors.
 * It automatically prepends /api/v1 if the path doesn't start with it.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('/api/v1/') ? path : path.replace('/api/', '/api/v1/');
  const targetUrl = new URL(normalizedPath, window.location.origin).toString();
  try {
    const res = await fetch(targetUrl, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
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