import type { ApiEnvelope } from './types';

// VITE_API_URL is baked in at build time (see .env.production) — falls
// back to the local dev backend so `npm run dev` keeps working with no
// env file present.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1';

// Uploaded files (product photos) are served as plain static files from
// the backend's public/ root, not under /api/v1 — so a path the API
// returns (e.g. "uploads/products/12_ab3f.jpg") needs the "/api/v1" suffix
// stripped off BASE_URL rather than appended to it.
const ASSET_ORIGIN = BASE_URL.replace(/\/api\/v1\/?$/, '');

/** Builds a browser-loadable URL for a relative asset path the API returned (e.g. a product's image_path). */
export function assetUrl(path: string): string {
  return `${ASSET_ORIGIN}/${path.replace(/^\/+/, '')}`;
}

export class ApiError extends Error {
  status: number;
  errors: Record<string, string> | null;

  constructor(message: string, status: number, errors: Record<string, string> | null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
  if (access) localStorage.setItem('access_token', access);
  else localStorage.removeItem('access_token');
  if (refresh) localStorage.setItem('refresh_token', refresh);
  else localStorage.removeItem('refresh_token');
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Lets AuthContext know a request came back unauthenticated with no way to
// recover (refresh failed or there was no session at all), so it can clear
// the logged-in user and bounce back to the Login screen — otherwise a
// screen just sits there silently failing every request forever.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function requestEnvelope<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true
): Promise<ApiEnvelope<T>> {
  // FormData (file uploads) must NOT get a JSON Content-Type or be
  // stringified — the browser sets its own multipart boundary header,
  // and setting one manually here would omit that boundary and break it.
  const isFormData = body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const envelope = (await res.json()) as ApiEnvelope<T>;

  if (!res.ok) {
    // Access token expired/revoked mid-session: try refreshing once, then replay the request.
    if (res.status === 401 && retry && refreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return requestEnvelope<T>(method, path, body, false);
      }
    }
    if (res.status === 401) {
      setTokens(null, null);
      onUnauthorized?.();
    }
    throw new ApiError(envelope.message || 'Request failed', res.status, envelope.errors);
  }

  return envelope;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const envelope = await requestEnvelope<T>(method, path, body);
  return envelope.data as T;
}

// The backend rotates refresh tokens — each one is single-use, so two
// concurrent 401s (routine: a screen firing several parallel GET requests
// right as the access token expires) can't both call the real refresh
// endpoint with the same token. The second would get "revoked" and the
// user would be wrongly bounced to the login screen. Sharing one in-flight
// promise means every concurrent caller awaits the same refresh instead.
let refreshPromise: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const envelope = (await res.json()) as ApiEnvelope<{ access_token: string; refresh_token: string }>;
      if (!envelope.data) return false;
      setTokens(envelope.data.access_token, envelope.data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => request<T>('POST', path, formData),
  // Admin list screens need the pagination meta (total/last_page)
  // alongside the rows, which the plain data-only helpers above discard.
  getPaged: async <T>(path: string): Promise<{ data: T[]; meta: ApiEnvelope<T[]>['meta'] }> => {
    const envelope = await requestEnvelope<T[]>('GET', path);
    return { data: envelope.data ?? [], meta: envelope.meta };
  },
};
