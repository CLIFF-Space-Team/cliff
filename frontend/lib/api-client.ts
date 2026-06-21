/**
 * Typed fetch wrapper for the backend API.
 *
 * - AbortController-friendly (pass `signal` for cleanup on unmount)
 * - Respects `Retry-After` on 429
 * - Maps non-2xx responses to `ApiError` with a stable `code`
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * REST + WebSocket base URLs are resolved at runtime (in the browser) from
 * the page's own origin. This way:
 *   - HTTPS pages always upgrade WebSocket to `wss://` (no mixed-content)
 *   - The same build deploys behind any domain (notcome.app, localhost, …)
 *   - SSR build still has a sane fallback for build-time imports
 *
 * Env overrides (`NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`) still win when
 * the backend is on a different host — useful for split deployments.
 */
function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:8000';
}

function resolveWsBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost:8000';
}

export const API_BASE_URL = resolveApiBase();
export const WS_BASE_URL = resolveWsBase();

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;
  retryAfter: number | null;

  constructor(opts: {
    message: string;
    status: number;
    code: string;
    details?: Record<string, unknown>;
    retryAfter?: number | null;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? {};
    this.retryAfter = opts.retryAfter ?? null;
  }
}

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

// ────────────────────────────────────────────────────────────────────────
// Admin bearer token
// Persisted in localStorage so the operator can log in once on a non-
// whitelisted device (phone, hotspot) and stay authenticated across page
// reloads. Cleared by setAdminToken(null) on explicit logout.
// ────────────────────────────────────────────────────────────────────────

const ADMIN_TOKEN_KEY = 'cliff:admin_token';
let _adminToken: string | null = null;

if (typeof window !== 'undefined') {
  try {
    _adminToken = window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    _adminToken = null;
  }
}

export function setAdminToken(token: string | null): void {
  _adminToken = token && token.trim() ? token.trim() : null;
  if (typeof window === 'undefined') return;
  try {
    if (_adminToken) {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, _adminToken);
    } else {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // Storage might be disabled in private mode; the in-memory copy still
    // works for the rest of this tab.
  }
}

export function getAdminToken(): string | null {
  return _adminToken;
}

function buildUrl(endpoint: string, query: FetchOptions['query']): string {
  const path = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    body,
    query,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers,
    signal,
    ...rest
  } = options;

  const url = buildUrl(endpoint, query);
  const controller = new AbortController();
  // Differentiate "we hit our own timeout" from "the caller cancelled". The
  // first is a real failure surfaced as ApiError; the second is normal
  // lifecycle (component unmounted, query cancelled) and must NOT raise an
  // unhandled error — React Query / consumers expect a native AbortError so
  // it can be silently ignored.
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // If caller passed their own signal, mirror its abort into ours.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  // Build the header bag in this order: defaults → admin bearer (if set) →
  // caller-supplied (so per-call overrides win, and an empty caller header
  // can intentionally clear ours).
  const builtHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (_adminToken) {
    builtHeaders.Authorization = `Bearer ${_adminToken}`;
  }
  if (headers) {
    Object.assign(builtHeaders, headers as Record<string, string>);
  }

  const init: RequestInit = {
    ...rest,
    signal: controller.signal,
    headers: builtHeaders,
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      if (timedOut) {
        throw new ApiError({
          status: 408,
          code: 'TIMEOUT',
          message: `Request timed out after ${timeoutMs}ms`,
        });
      }
      // Caller-driven cancellation: rethrow the native AbortError so the
      // surrounding async code (React Query, useEffect cleanup, manual
      // controllers) treats it as a normal cancellation.
      throw err;
    }
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: (err as Error).message,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    payload = await response.text().catch(() => '');
  }

  if (!response.ok) {
    const retryAfterRaw = response.headers.get('retry-after');
    const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : null;
    const json = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
    // FastAPI wraps HTTPException(detail=...) into `{"detail": {...}}`. Pick
    // the inner record when present so consumers don't have to peel that
    // layer off themselves.
    const inner =
      json.detail && typeof json.detail === 'object'
        ? (json.detail as Record<string, unknown>)
        : json;
    throw new ApiError({
      status: response.status,
      code: typeof inner.code === 'string' ? inner.code : `HTTP_${response.status}`,
      message:
        typeof inner.message === 'string'
          ? inner.message
          : typeof inner.detail === 'string'
            ? inner.detail
            : `Request failed with ${response.status}`,
      details: typeof inner.details === 'object' && inner.details !== null
        ? (inner.details as Record<string, unknown>)
        : {},
      retryAfter,
    });
  }

  return payload as T;
}

export const api = {
  get: <T>(endpoint: string, options: Omit<FetchOptions, 'body'> = {}) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options: FetchOptions = {}) =>
    apiFetch<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options: FetchOptions = {}) =>
    apiFetch<T>(endpoint, { ...options, method: 'PUT', body }),
  delete: <T>(endpoint: string, options: FetchOptions = {}) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
