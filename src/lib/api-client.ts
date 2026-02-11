import { ApiResponse } from "../../shared/types"
/**
 * Enhanced API utility that handles versioning and categorizes errors.
 * It automatically prepends /api/v1 if the path doesn't start with it.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Ensure we use the robust v1 namespace
  const targetPath = path.startsWith('/api/v1/') ? path : path.replace('/api/', '/api/v1/');
  try {
    const res = await fetch(targetPath, {
      headers: { 
        'Content-Type': 'application/json',
        'X-MarkFlow-Version': '1.0.0'
      },
      ...init
    });
    if (!res.ok) {
      // Handle expected scenarios gracefully
      if (res.status === 404) {
        throw new Error(`Resource not found: ${targetPath}`);
      }
      const errorText = await res.text().catch(() => 'No error detail available');
      console.error(`[API ERROR] Status: ${res.status}, Detail: ${errorText}, Path: ${targetPath}`);
      throw new Error(`Server returned status ${res.status}`);
    }
    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success || json.data === undefined) {
      const errorMessage = json.error || 'Request failed';
      console.warn(`[API WARNING] Unsuccessful response: ${errorMessage} at ${targetPath}`);
      throw new Error(errorMessage);
    }
    return json.data;
  } catch (err) {
    // Only log critical fetch failures (network issues, etc.)
    if (err instanceof Error && !err.message.includes('not found')) {
      console.error(`[API FETCH FAILED] Path: ${targetPath}`, err);
    }
    throw err;
  }
}