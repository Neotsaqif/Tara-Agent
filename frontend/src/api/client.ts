export type Health = { status: string; environment: string };
export const workflowStates = [
  "diagnosing",
  "options_presented",
  "pending_approval",
  "reexecuting",
  "revision_requested",
  "executing",
  "monitoring",
  "closed",
] as const;
export type WorkflowState = (typeof workflowStates)[number];
export type Decision = "approve" | "reject" | "revise";
export type DecisionRequest = {
  state: WorkflowState;
  decision: Decision;
  approved_by?: string;
  revision_parameters?: Record<string, string>;
};
export type DecisionResponse = {
  state: WorkflowState;
  decision: Decision;
  event_id: string;
  revision_parameters: Record<string, string>;
};
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);
// The development proxy avoids changing backend CORS or exposing server credentials.
async function request<T>(
  path: string,
  options: RequestInit,
  validate: (value: unknown) => value is T,
): Promise<T> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 8000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout.signal])
    : timeout.signal;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal,
      headers: { Accept: "application/json", ...options.headers },
    });
    const value: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      // Do not echo arbitrary server payloads: errors can contain sensitive data.
      const message =
        response.status === 403
          ? "Permintaan ditolak (403). approved_by bukan autentikasi atau bukti izin."
          : response.status === 409
            ? "Transisi tidak sah (409). Periksa state dan parameter revisi."
            : response.status === 422
              ? "Data request tidak valid (422). Periksa field dan enum."
              : `API gagal merespons (${response.status}).`;
      throw new ApiError(response.status, message);
    }
    if (!validate(value))
      throw new ApiError(
        response.status,
        "Format respons API tidak sesuai kontrak. Tidak ada data demo pengganti.",
      );
    return value;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal.aborted)
      throw new ApiError(
        0,
        "Permintaan dibatalkan atau melewati batas waktu 8 detik.",
      );
    throw new ApiError(
      0,
      "API tidak dapat dihubungi. Periksa server dan konfigurasi koneksi.",
    );
  } finally {
    clearTimeout(timer);
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isHealth(value: unknown): value is Health {
  return (
    record(value) &&
    typeof value.status === "string" &&
    typeof value.environment === "string"
  );
}
function isDecision(value: unknown): value is DecisionResponse {
  return (
    record(value) &&
    workflowStates.includes(value.state as WorkflowState) &&
    ["approve", "reject", "revise"].includes(value.decision as string) &&
    typeof value.event_id === "string" &&
    record(value.revision_parameters) &&
    Object.values(value.revision_parameters).every(
      (item) => typeof item === "string",
    )
  );
}
export const api = {
  health: (signal?: AbortSignal) =>
    request("/api/v1/health", { signal }, isHealth),
  decision: (body: DecisionRequest, signal?: AbortSignal) =>
    request(
      "/api/v1/workflows/decision",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      },
      isDecision,
    ),
};
