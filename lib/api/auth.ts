import type { AuthResponse, LoginRequest, SignupRequest, User } from "@/types";
import {
  apiRequest,
  clearAccessToken,
  setAuthTokens,
  setAccessToken,
} from "./client";

function persistAuth(res: AuthResponse): AuthResponse {
  setAuthTokens(res.accessToken, res.refreshToken ?? null);
  return res;
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: data,
    auth: false,
  });
  return persistAuth(res);
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: data,
    auth: false,
  });
  return persistAuth(res);
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/auth/logout", { method: "POST" });
  } catch {
    // ignore network errors on logout
  } finally {
    clearAccessToken();
  }
}

export async function getMe(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

export async function updateProfile(data: {
  name?: string;
  title?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  return apiRequest<User>("/auth/me", { method: "PATCH", body: data });
}

export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append("avatar", file);
  return apiRequest<User>("/auth/me/avatar", { method: "POST", body: form });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<{ ok: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

export async function resetPassword(data: {
  accessToken: string;
  refreshToken?: string;
  password: string;
}): Promise<void> {
  await apiRequest<{ ok: boolean }>("/auth/reset-password", {
    method: "POST",
    body: data,
    auth: false,
  });
}

export async function exchangeGoogleSession(data: {
  accessToken: string;
  refreshToken?: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>("/auth/oauth/google", {
    method: "POST",
    body: data,
    auth: false,
  });
  return persistAuth(res);
}

export async function createGuestSession(data: {
  roomId: string;
  displayName: string;
  passcode?: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>("/auth/guest", {
    method: "POST",
    body: data,
    auth: false,
  });
  setAccessToken(res.accessToken);
  return res;
}

export async function sendPresenceHeartbeat(): Promise<void> {
  await apiRequest<void>("/presence/heartbeat", { method: "POST" });
}
