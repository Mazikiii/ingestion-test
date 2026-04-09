const API_BASE = "/api";

async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken");
}

async function getRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

function setTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens() {
  sessionStorage.remove("accessToken");
  localStorage.remove("refreshToken");
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
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
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
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
        window.location.href = "/login";
        return new Response(null, { status: 401 });
      }

      const newAccessToken = await getAccessToken();
      headers["Authorization"] = `Bearer ${newAccessToken}`;

      return fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  return res;
}

const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint, { method: "GET" }),
  post: (endpoint: string, body?: unknown) =>
    fetchWithAuth(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: (endpoint: string, body?: unknown) =>
    fetchWithAuth(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint: string) =>
    fetchWithAuth(endpoint, { method: "DELETE" }),

  setTokens,
  clearTokens,
  getAccessToken,
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