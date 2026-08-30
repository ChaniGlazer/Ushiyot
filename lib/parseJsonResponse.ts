/**
 * Parses a fetch Response body as JSON, converting any parse failure - a non-JSON error page
 * from a gateway/proxy timeout, an empty body, etc. - into a generic Hebrew message instead of
 * letting a raw, untranslated SyntaxError ("Unexpected token '<'...") reach the UI. Client-side
 * only (every API route here already returns real JSON on its own error paths, so this only
 * matters for failures that never reach the route handler at all).
 */
// No explicit return type annotation - inferred as Promise<any> from response.json() itself,
// same as every call site already got implicitly before this helper existed (none of them work
// against a typed response shape).
export async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error("שגיאת תקשורת עם השרת, נסו שוב");
  }
}
