type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string | null;
  avatar: string | null;
  description: string;
};

type TokenPair = {
  access: string;
  refresh: string;
};

type RequestOptions = {
  auth?: boolean;
  retry?: boolean;
};

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";
const DEFAULT_LOCAL_BACKEND = "http://127.0.0.1:8000";
const NGROK_HEADER = "ngrok-skip-browser-warning";
export const AUTH_USER_UPDATED_EVENT = "auth-user-updated";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const isBrowser = () => typeof window !== "undefined";

const toBoolean = (value: unknown) => String(value).toLowerCase() === "true";

export const resolveBackendBaseUrl = () => {
  const env = import.meta.env;
  const debug = toBoolean(env.VITE_DEBUG);
  const configuredBaseUrl = env.VITE_API_URL || env.VITE_BACKEND_URL || env.VITE_NGROK_PATH;

  if (debug) return DEFAULT_LOCAL_BACKEND;
  return configuredBaseUrl || DEFAULT_LOCAL_BACKEND;
};

const buildUrl = (path: string) => `${resolveBackendBaseUrl()}${path}`;

const getStorageItem = (key: string) => {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(key);
};

const setStorageItem = (key: string, value: string) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, value);
};

const removeStorageItem = (key: string) => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
};

const dispatchAuthUserUpdated = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
};

const toErrorMessage = (status: number, data: unknown) => {
  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }

    const firstValue = Object.values(record)[0];
    if (typeof firstValue === "string" && firstValue.trim()) {
      return firstValue;
    }

    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
  }

  return status >= 500 ? "Server error. Please try again later." : "Request failed.";
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as Json;
  } catch {
    return text;
  }
};

export const apiRequest = async <T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> => {
  const { auth = true, retry = true } = options;
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  headers.set(NGROK_HEADER, "true");

  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = auth ? getAccessToken() : null;
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  if (response.status === 401 && auth && retry) {
    const refreshedToken = await tryRefreshAccessToken();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      response = await fetch(buildUrl(path), {
        ...init,
        headers,
      });
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession();
    }
    throw new ApiError(toErrorMessage(response.status, data), response.status, data);
  }

  return data as T;
};

const parseFilename = (header: string | null, fallback: string) => {
  if (!header) return fallback;
  // Prefer RFC 5987 `filename*=UTF-8''...` (percent-encoded) over plain filename.
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // fall through to the plain filename
    }
  }
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ?? fallback;
};

/**
 * Authenticated binary download (mirrors apiRequest: JWT header + refresh-on-401)
 * but returns the response body as a Blob plus the server-suggested filename.
 */
export const apiDownload = async (
  path: string,
  fallbackFilename = "download",
): Promise<{ blob: Blob; filename: string }> => {
  const headers = new Headers();
  headers.set(NGROK_HEADER, "true");

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(buildUrl(path), { headers });

  if (response.status === 401) {
    const refreshedToken = await tryRefreshAccessToken();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      response = await fetch(buildUrl(path), { headers });
    }
  }

  if (!response.ok) {
    const data = await parseResponse(response);
    if (response.status === 401) {
      clearAuthSession();
    }
    throw new ApiError(toErrorMessage(response.status, data), response.status, data);
  }

  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("Content-Disposition"), fallbackFilename);
  return { blob, filename };
};

export const getAccessToken = () => getStorageItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => getStorageItem(REFRESH_TOKEN_KEY);

export const isAuthenticated = () => Boolean(getAccessToken());

export const getStoredUser = (): AuthUser | null => {
  const raw = getStorageItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    removeStorageItem(USER_KEY);
    return null;
  }
};

export const setStoredUser = (data: Partial<AuthUser>) => {
  const normalizedUser = normalizeUser(data);
  setStorageItem(USER_KEY, JSON.stringify(normalizedUser));
  dispatchAuthUserUpdated();
  return normalizedUser;
};

const saveAuthSession = (tokens: TokenPair, user: AuthUser) => {
  setStorageItem(ACCESS_TOKEN_KEY, tokens.access);
  setStorageItem(REFRESH_TOKEN_KEY, tokens.refresh);
  setStoredUser(user);
};

export const clearAuthSession = () => {
  removeStorageItem(ACCESS_TOKEN_KEY);
  removeStorageItem(REFRESH_TOKEN_KEY);
  removeStorageItem(USER_KEY);
  dispatchAuthUserUpdated();
};

const normalizeUser = (data: Partial<AuthUser>): AuthUser => ({
  id: data.id ?? 0,
  username: data.username ?? "",
  email: data.email ?? "",
  first_name: data.first_name ?? "",
  last_name: data.last_name ?? "",
  role: data.role ?? null,
  avatar: data.avatar ?? null,
  description: data.description ?? "",
});

export const fetchCurrentUser = async () => {
  const user = await apiRequest<Partial<AuthUser>>("/api/me/");
  return setStoredUser(user);
};

const tryRefreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const tokens = await apiRequest<Pick<TokenPair, "access">>(
      "/api/token/refresh/",
      {
        method: "POST",
        body: JSON.stringify({ refresh }),
      },
      { auth: false, retry: false },
    );

    setStorageItem(ACCESS_TOKEN_KEY, tokens.access);
    return tokens.access;
  } catch {
    clearAuthSession();
    return null;
  }
};

export const login = async (username: string, password: string) => {
  const tokens = await apiRequest<TokenPair>(
    "/api/token/",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    { auth: false, retry: false },
  );

  setStorageItem(ACCESS_TOKEN_KEY, tokens.access);
  setStorageItem(REFRESH_TOKEN_KEY, tokens.refresh);

  try {
    const user = await fetchCurrentUser();
    saveAuthSession(tokens, user);
    return { ...tokens, user };
  } catch (error) {
    clearAuthSession();
    throw error;
  }
};

export const logout = () => {
  clearAuthSession();
};

export const getUserDisplayName = (user: AuthUser | null) => {
  if (!user) return "Teacher";
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username || "Teacher";
};

export const getUserInitials = (user: AuthUser | null) => {
  const displayName = getUserDisplayName(user);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "T";
};
