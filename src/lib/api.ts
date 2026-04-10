const API_BASE = "/api";
const PIN_SETUP_KEY = "neroPinSetupComplete";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem(PIN_SETUP_KEY);
}

export function markPinSetupRequired() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIN_SETUP_KEY, "false");
}

export function markPinSetupCompleted() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PIN_SETUP_KEY, "true");
}

export function hasPendingPinSetup(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PIN_SETUP_KEY) === "false";
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    if (isRefreshing && refreshPromise) {
      const success = await refreshPromise;
      if (!success) {
        return new Response(null, { status: 401 });
      }
    } else {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
      const success = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (!success) {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return new Response(null, { status: 401 });
      }

      const newAccessToken = getAccessToken();
      headers["Authorization"] = `Bearer ${newAccessToken}`;

      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        cache: "no-store",
      });
    }
  }

  return res;
}

export async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Error: ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // Not JSON
    }
    throw new Error(message);
  }
  return res.json();
}

const api = {
  get: async (endpoint: string) => {
    const res = await fetchWithAuth(endpoint, { method: "GET" });
    return res;
  },

  post: async (endpoint: string, body?: unknown) => {
    const res = await fetchWithAuth(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  },

  patch: async (endpoint: string, body?: unknown) => {
    const res = await fetchWithAuth(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  },

  delete: async (endpoint: string) => {
    const res = await fetchWithAuth(endpoint, { method: "DELETE" });
    return res;
  },

  setTokens,
  clearTokens,
  getAccessToken,
  markPinSetupRequired,
  markPinSetupCompleted,
  hasPendingPinSetup,
};

export default api;

export function formatNaira(kobo: string | number): string {
  const num = typeof kobo === "string" ? parseInt(kobo, 10) : kobo;
  return `N${(num / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function koboToNaira(kobo: string | number): number {
  return typeof kobo === "string" ? parseInt(kobo, 10) / 100 : kobo / 100;
}
