import type { UserAccount } from "@/lib/api/types";

const ACCESS = "senoria.admin.accessToken";
const REFRESH = "senoria.admin.refreshToken";
const EXPIRES = "senoria.admin.accessTokenExpiresAt";
const USER = "senoria.admin.user";
const FLASH = "senoria.admin.flash";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getAccessToken(): string {
  return storage()?.getItem(ACCESS) ?? "";
}

export function getRefreshToken(): string {
  return storage()?.getItem(REFRESH) ?? "";
}

export function getAccessExpiresAt(): number | null {
  const raw = storage()?.getItem(EXPIRES);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function getStoredUser(): UserAccount | null {
  const raw = storage()?.getItem(USER);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserAccount;
    if (!parsed || typeof parsed !== "object" || typeof parsed.email !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  return getAccessToken().length > 0;
}

export type TokenState = "ok" | "refresh" | "missing-expiry" | "signed-out";

export function tokenState(now = Date.now()): TokenState {
  const access = getAccessToken();
  if (!access) return "signed-out";
  const expiresAt = getAccessExpiresAt();
  if (!expiresAt) return "missing-expiry";
  if (now >= expiresAt - REFRESH_BUFFER_MS) return "refresh";
  return "ok";
}

export function saveSession(input: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  user?: UserAccount | null;
}): void {
  const store = storage();
  if (!store) return;
  store.setItem(ACCESS, input.accessToken);
  if (typeof input.refreshToken === "string" && input.refreshToken.length > 0) {
    store.setItem(REFRESH, input.refreshToken);
  }
  if (input.expiresIn > 0) {
    store.setItem(EXPIRES, String(Date.now() + input.expiresIn * 1000));
  }
  if (input.user) store.setItem(USER, JSON.stringify(input.user));
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(ACCESS);
  store.removeItem(REFRESH);
  store.removeItem(EXPIRES);
  store.removeItem(USER);
}

let sessionEndStarted = false;

export function endSession(): void {
  clearSession();
  if (typeof window === "undefined") return;
  if (sessionEndStarted) return;
  sessionEndStarted = true;
  window.dispatchEvent(new Event("senoria-session-end"));
}

export function resetSessionEndGuard(): void {
  sessionEndStarted = false;
}

export function setFlash(message: string): void {
  if (typeof window === "undefined") return;
  if (!message) window.sessionStorage.removeItem(FLASH);
  else window.sessionStorage.setItem(FLASH, message);
}

export function consumeFlash(): string {
  if (typeof window === "undefined") return "";
  const message = window.sessionStorage.getItem(FLASH) ?? "";
  window.sessionStorage.removeItem(FLASH);
  return message;
}
