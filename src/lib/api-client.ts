import { ApiResponse } from "../../shared/types"
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(path, { 
      headers: { 'Content-Type': 'application/json' }, 
      ...init 
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No error detail available');
      console.error(`[API ERROR] Status: ${res.status}, Detail: ${errorText}`);
      throw new Error(`Server returned status ${res.status}`);
    }
    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success || json.data === undefined) {
      console.warn(`[API WARNING] Unsuccessful response: ${json.error || 'Request failed'}`);
      throw new Error(json.error || 'Request failed');
    }
    return json.data;
  } catch (err) {
    console.error(`[API FETCH FAILED] Path: ${path}`, err);
    throw err;
  }
}