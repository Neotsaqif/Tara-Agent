import { API_BASE_URL, ApiError } from "../api/client";

export type Principal = {
  user_id: string;
  email: string;
  roles: string[];
  organization_id: string;
  display_name?: string;
  [key: string]: unknown;
};

export type Organization = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  principal: Principal;
  organizations: Organization[];
};

export type AuthState =
  | { status: "anonymous" }
  | { status: "authenticated"; bundle: TokenBundle };

const STORAGE_KEY = "tara.auth.bundle";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrincipal(value: unknown): value is Principal {
  return (
    record(value) &&
    typeof value.user_id === "string" &&
    typeof value.email === "string" &&
    Array.isArray(value.roles) && value.roles.every((item) => typeof item === "string")
  );
}

function isTokenBundle(value: unknown): value is TokenBundle {
  return (
    record(value) &&
    typeof value.access_token === "string" &&
    typeof value.refresh_token === "string" &&
    typeof value.expires_in === "number" &&
    isPrincipal(value.principal) &&
    Array.isArray(value.organizations)
  );
}

export function readStoredBundle(): TokenBundle | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isTokenBundle(parsed)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storeBundle(bundle: TokenBundle | null) {
  try {
    if (bundle) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); degrade to in-memory only.
  }
}

async function postJson(path: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const composite = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: composite,
    });
    const value: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = record(value) && typeof value.detail === "string" ? value.detail : null;
      // Do not surface raw server payloads; only safe, known messages.
      const message =
        response.status === 401
          ? detail ?? "Email atau kata sandi salah."
          : response.status === 423
            ? "Akun terkunci sementara. Coba lagi nanti."
            : response.status === 422
              ? "Format permintaan tidak valid."
              : `Autentikasi gagal (${response.status}).`;
      throw new ApiError(response.status, message);
    }
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (composite.aborted) throw new ApiError(408, "Permintaan autentikasi melewati batas waktu.");
    throw new ApiError(0, "Tidak dapat menghubungi layanan autentikasi.");
  } finally {
    clearTimeout(timer);
  }
}

export async function login(
  email: string,
  password: string,
  organizationId?: string,
  signal?: AbortSignal,
): Promise<TokenBundle> {
  const trimmed = email.trim();
  if (!trimmed || !password) throw new ApiError(422, "Email dan kata sandi wajib diisi.");
  const value = await postJson(
    "/api/v1/auth/login",
    { email: trimmed, password, organization_id: organizationId ?? null },
    signal,
  );
  if (!isTokenBundle(value)) throw new ApiError(200, "Format respons login tidak sesuai kontrak.");
  storeBundle(value);
  return value;
}

export async function refresh(bundle: TokenBundle, signal?: AbortSignal): Promise<TokenBundle> {
  const value = await postJson(
    "/api/v1/auth/refresh",
    { refresh_token: bundle.refresh_token, organization_id: bundle.principal.organization_id ?? null },
    signal,
  );
  if (!isTokenBundle(value)) throw new ApiError(200, "Format respons refresh tidak sesuai kontrak.");
  storeBundle(value);
  return value;
}

export async function logout(bundle: TokenBundle): Promise<void> {
  try {
    await postJson("/api/v1/auth/logout", { refresh_token: bundle.refresh_token });
  } catch {
    // Logout is best-effort; local state is cleared regardless.
  }
  storeBundle(null);
}
