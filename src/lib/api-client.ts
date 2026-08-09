"use client";

/**
 * Thin client-side fetch wrapper for the dashboard UI — attaches the access
 * token as a Bearer header and unwraps the { data } / { error } envelope
 * every route handler already uses (docs/api/10_API_Architecture.md). This
 * contains no business logic: every rule (validation, authorization, state
 * transitions) lives server-side in the existing use cases; this file only
 * knows how to shape an HTTP request and parse its response.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  accessToken?: string;
  body?: unknown;
  /** Lets a caller cancel an in-flight request (e.g. AuthProvider's mount-time refresh, which must not let React Strict Mode's dev-only double-invoke send two real requests against a single-use, rotating refresh-token cookie). */
  signal?: AbortSignal;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.accessToken) headers["Authorization"] = `Bearer ${options.accessToken}`;

  const response = await fetch(path, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    // Only /api/auth/{refresh,logout} actually rely on the httpOnly cookie;
    // including credentials on every request is harmless for the rest.
    credentials: "include",
    signal: options.signal,
  });

  const json: unknown = await response.json().catch(() => null);
  const envelope = json as { data?: T; error?: { code: string; message: string; details?: unknown } } | null;

  if (!response.ok) {
    const err = envelope?.error ?? { code: "UNKNOWN_ERROR", message: "Request failed" };
    throw new ApiError(response.status, err.code, err.message, err.details);
  }

  return (envelope?.data ?? envelope) as T;
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match?.[1] ?? null;
}

/**
 * For file-download endpoints (Day 10's CSV exports) — these don't return
 * the `{ data }` JSON envelope, so this bypasses `request()` and reads the
 * raw response body as a Blob, extracting the server-provided filename
 * from Content-Disposition rather than the caller having to guess one.
 */
async function download(
  path: string,
  accessToken: string | undefined,
  fallbackFilename: string,
): Promise<{ blob: Blob; filename: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(path, { method: "GET", headers, credentials: "include" });

  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
    const err = envelope?.error ?? { code: "UNKNOWN_ERROR", message: "Export failed" };
    throw new ApiError(response.status, err.code, err.message);
  }

  const blob = await response.blob();
  const filename = parseFilenameFromContentDisposition(response.headers.get("Content-Disposition")) ?? fallbackFilename;
  return { blob, filename };
}

/**
 * V3.0: multipart file upload (avatar today). Bypasses `request()`'s
 * JSON.stringify + Content-Type: application/json — the browser sets the
 * correct multipart boundary header itself when given a FormData body.
 */
async function upload<T>(path: string, formData: FormData, accessToken?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const response = await fetch(path, { method: "POST", headers, body: formData, credentials: "include" });

  const json: unknown = await response.json().catch(() => null);
  const envelope = json as { data?: T; error?: { code: string; message: string; details?: unknown } } | null;

  if (!response.ok) {
    const err = envelope?.error ?? { code: "UNKNOWN_ERROR", message: "Upload failed" };
    throw new ApiError(response.status, err.code, err.message, err.details);
  }

  return (envelope?.data ?? envelope) as T;
}

export const apiClient = {
  get: <T>(path: string, accessToken?: string) => request<T>("GET", path, { accessToken }),
  post: <T>(path: string, body?: unknown, accessToken?: string, signal?: AbortSignal) =>
    request<T>("POST", path, { accessToken, body, signal }),
  patch: <T>(path: string, body?: unknown, accessToken?: string) =>
    request<T>("PATCH", path, { accessToken, body }),
  put: <T>(path: string, body?: unknown, accessToken?: string) =>
    request<T>("PUT", path, { accessToken, body }),
  delete: <T>(path: string, accessToken?: string) => request<T>("DELETE", path, { accessToken }),
  download,
  upload,
};
