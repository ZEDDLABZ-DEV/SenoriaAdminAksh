import { ApiError, readError } from "@/lib/api/errors";
import {
  endSession,
  getAccessExpiresAt,
  getAccessToken,
  getRefreshToken,
  saveSession,
  tokenState,
} from "@/lib/api/session";

const DEFAULT_BASE_URL = "https://api.senoriaseniors.com/api/v1";
const CLIENT_HEADER = "senoria-admin-web/1.0.0";
const TIMEOUT_MS = 30_000;

export function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return (configured || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function isAuthPath(path: string): boolean {
  return path.includes("/auth/login") || path.includes("/auth/refresh");
}

function buildUrl(path: string, query?: Record<string, string | number | null | undefined>): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${apiBaseUrl()}${normalized}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function parseSuccessBody(text: string): unknown {
  if (!text.trim()) return {};
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return { data: parsed };
  if (parsed && typeof parsed === "object") return parsed;
  return { data: parsed };
}

interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | null | undefined>;
  body?: unknown;
  authenticate?: boolean;
  retried?: boolean;
  headers?: Record<string, string>;
  accept?: string;
}

interface ExecuteOptions extends RequestOptions {
  asFile?: boolean;
  fallbackFilename?: string;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
  contentType: string;
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const encoded = /filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    const raw = encoded[1].trim().replace(/^"|"$/g, "");
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded) return decoded;
    } catch {
      if (raw) return raw;
    }
  }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  const plain = quoted ?? /filename\s*=\s*([^";]+)/i.exec(header);
  const name = plain?.[1]?.trim();
  return name || fallback;
}

let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  let response: Response;
  try {
    response = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Client": CLIENT_HEADER,
      },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return false;
  }

  const text = await response.text();
  console.info(`[senoria] POST /auth/refresh -> ${response.status}`);
  if (response.status < 200 || response.status > 299) return false;

  let body: unknown;
  try {
    body = text.trim() ? JSON.parse(text) : {};
  } catch {
    return false;
  }

  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const data = root?.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null;
  const accessToken = data?.accessToken;
  if (!data || typeof accessToken !== "string" || !accessToken) return false;

  const expiresIn = typeof data.expiresIn === "number" ? data.expiresIn : 0;
  if (expiresIn <= 0) {
    endSession();
    return false;
  }

  const nextRefresh = typeof data.refreshToken === "string" ? data.refreshToken : null;
  saveSession({ accessToken, refreshToken: nextRefresh, expiresIn });
  return true;
}

export function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function msUntilRefresh(): number | null {
  const expiresAt = getAccessExpiresAt();
  if (!expiresAt) return null;
  return Math.max(0, expiresAt - 5 * 60 * 1000 - Date.now());
}

async function execute(path: string, options: ExecuteOptions = {}): Promise<unknown | DownloadedFile> {
  const method = options.method ?? "GET";
  const authenticate = options.authenticate !== false;

  if (authenticate && !isAuthPath(path)) {
    const state = tokenState();
    if (state === "missing-expiry") {
      endSession();
      throw new ApiError(401, "Your session has ended. Sign in again.");
    }
    if (state === "refresh") {
      await refreshAccessToken();
      if (!getAccessToken()) {
        throw new ApiError(401, "Your session has ended. Sign in again.");
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: options.accept ?? "application/json",
    "X-Client": CLIENT_HEADER,
    ...options.headers,
  };

  if (authenticate) {
    const accessToken = getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.info(`[senoria] ${method} ${path} -> network`);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ApiError(0, "The request timed out. Try again.");
    }
    throw new ApiError(0, "Network error. Check your connection and try again.");
  }

  console.info(`[senoria] ${method} ${path} -> ${response.status}`);

  if (response.status === 401 && authenticate && !isAuthPath(path)) {
    const hadSession = Boolean(getAccessToken() || getRefreshToken());
    if (!options.retried && getRefreshToken()) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return execute(path, { ...options, retried: true });
    }
    if (hadSession || getAccessToken() || getRefreshToken()) {
      endSession();
      throw new ApiError(401, "Your session has ended. Sign in again.");
    }
  }

  if (options.asFile && response.status >= 200 && response.status < 300) {
    const contentType = response.headers.get("content-type") ?? "application/pdf";
    const raw = await response.blob();
    const blob = raw.type ? raw : new Blob([raw], { type: contentType });
    return {
      blob,
      filename: filenameFromContentDisposition(
        response.headers.get("content-disposition"),
        options.fallbackFilename || "download",
      ),
      contentType,
    } satisfies DownloadedFile;
  }

  const text = await response.text();

  let body: unknown = {};
  if (text.trim()) {
    try {
      body = parseSuccessBody(text);
    } catch {
      if (response.status >= 200 && response.status < 300) return {};
      throw new ApiError(
        response.status,
        response.status >= 500 ? "The server is unavailable. Try again shortly." : "Request failed",
      );
    }
  }

  if (response.status < 200 || response.status > 299) {
    throw readError(body, response.status);
  }

  return body;
}

export async function apiRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  return execute(path, options);
}

export async function apiDownload(
  path: string,
  options: RequestOptions & { fallbackFilename?: string } = {},
): Promise<DownloadedFile> {
  const result = await execute(path, { ...options, asFile: true });
  if (result && typeof result === "object" && "blob" in result && result.blob instanceof Blob) {
    return result as DownloadedFile;
  }
  throw new ApiError(0, "The file could not be downloaded.");
}
