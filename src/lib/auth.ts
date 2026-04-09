const API_BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Error: ${res.status}`;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // Response wasn't JSON
    }
    throw new ApiError(message, res.status);
  }
  return res.json();
}

export const authApi = {
  register: async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ userId: string; message: string }>(res);
  },

  verifyOtp: async (email: string, otp: string) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse<{ accessToken: string; refreshToken: string; userId: string }>(res);
  },

  login: async (email: string, pin: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pin }),
    });
    return handleResponse<{ accessToken: string; refreshToken: string; userId: string }>(res);
  },

  googleStart: async (redirectUrl: string) => {
    const res = await fetch(
      `${API_BASE}/auth/google/start?redirect_url=${encodeURIComponent(redirectUrl)}`,
      { method: "GET" }
    );
    return handleResponse<{ url: string }>(res);
  },

  resetPinRequest: async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-pin/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(res);
  },

  resetPinVerify: async (email: string, otp: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-pin/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse<{ valid: boolean }>(res);
  },

  resetPin: async (pin: string, confirmPin: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, confirmPin }),
    });
    return handleResponse<{ accessToken: string; refreshToken: string; userId: string }>(res);
  },

  setPin: async (pin: string, confirmPin: string) => {
    const res = await fetch(`${API_BASE}/auth/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, confirmPin }),
    });
    return handleResponse<{ accessToken: string; refreshToken: string; userId: string }>(res);
  },
};

export default authApi;
