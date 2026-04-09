const API_BASE = "/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type RegistrationStatus = 
  | "not_verified" 
  | "no_profile" 
  | "onboarding_incomplete" 
  | "pin_not_set" 
  | "complete";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  registrationStatus?: RegistrationStatus;
}

interface RegisterResponse {
  userId: string;
  message: string;
  registrationStatus?: RegistrationStatus;
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
    console.error("[AUTH] register:", email);
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse<RegisterResponse>(res);
  },

  verifyOtp: async (email: string, otp: string) => {
    console.error("[AUTH] verifyOtp:", email, otp);
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse<AuthResponse>(res);
  },

  login: async (email: string, pin: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pin }),
    });
    return handleResponse<AuthResponse>(res);
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
    return handleResponse<AuthResponse>(res);
  },

  setPin: async (pin: string, confirmPin: string) => {
    const res = await fetch(`${API_BASE}/auth/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, confirmPin }),
    });
    return handleResponse<AuthResponse>(res);
  },
};

export function getAuthRedirectPath(status?: RegistrationStatus): string {
  switch (status) {
    case "not_verified":
      return "/register";
    case "no_profile":
      return "/onboarding";
    case "onboarding_incomplete":
      return "/onboarding";
    case "pin_not_set":
      return "/onboarding";
    case "complete":
      return "/home";
    default:
      return "/onboarding";
  }
}

export default authApi;
