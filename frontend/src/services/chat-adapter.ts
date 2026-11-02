import { ApiError, API_BASE_URL } from "../api/client";
import type { ChatMessage } from "../components/chat/types";

export type Workflow = "auto" | "informational" | "diagnostic" | "goal_directed";
export type ChatRequest = {
  conversation_id?: string;
  message: string;
  workflow?: Workflow;
};
export type ChatApiResponse = {
  conversation_id: string;
  session_id: string;
  workflow: Exclude<Workflow, "auto">;
  status: string;
  answer: string;
  evidence: string[];
  assumptions: string[];
  limitations: string[];
  needs_approval: boolean;
  available_actions: string[];
  provider: string;
};
export type ChatAdapterCapabilities = {
  hasChatEndpoint: boolean;
  hasStreaming: boolean;
  hasPersistence: boolean;
  hasAuth: boolean;
};

export function getChatCapabilities(): ChatAdapterCapabilities {
  return { hasChatEndpoint: true, hasStreaming: false, hasPersistence: true, hasAuth: true };
}

function isChatResponse(value: unknown): value is ChatApiResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.conversation_id === "string" && typeof item.session_id === "string" && typeof item.workflow === "string" &&
    typeof item.status === "string" && typeof item.answer === "string" &&
    Array.isArray(item.evidence) && Array.isArray(item.assumptions) &&
    Array.isArray(item.limitations) && typeof item.needs_approval === "boolean" &&
    Array.isArray(item.available_actions) && typeof item.provider === "string";
}

export async function sendChatMessage(
  request: ChatRequest,
  options?: { signal?: AbortSignal; timeoutMs?: number; token?: string | null },
): Promise<ChatApiResponse> {
  const message = request.message.trim();
  if (!message) throw new ApiError(422, "Pertanyaan tidak boleh kosong.");
  const token = options?.token ?? null;
  if (!token) throw new ApiError(401, "Sesi tidak aktif. Masuk untuk menggunakan chat API nyata.");
  const timeoutMs = options?.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options?.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/agent/chat`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...request, message }),
      signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const statusMessage = response.status === 401 ? "Sesi kedaluwarsa. Masuk ulang untuk melanjutkan." :
        response.status === 403 ? "Akses ditolak untuk peran ini." :
        response.status === 503 ? "Layanan AI sedang tidak tersedia." :
        response.status === 422 ? "Format pertanyaan tidak valid." : `Panggilan chat gagal (${response.status}).`;
      throw new ApiError(response.status, statusMessage);
    }
    if (!isChatResponse(data)) throw new ApiError(response.status, "Format respons chat tidak sesuai kontrak.");
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal.aborted) throw new ApiError(408, "Permintaan chat melewati batas waktu.");
    throw new ApiError(0, "Gagal terhubung ke layanan chat backend.");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function responseToMessage(response: ChatApiResponse): ChatMessage {
  const details = [
    response.evidence.length ? `Evidence: ${response.evidence.join("; ")}` : "",
    response.assumptions.length ? `Asumsi: ${response.assumptions.join("; ")}` : "",
    response.limitations.length ? `Keterbatasan: ${response.limitations.join("; ")}` : "",
  ].filter(Boolean).join("\n");
  return { type: "ai_text", id: crypto.randomUUID(), content: details ? `${response.answer}\n\n${details}` : response.answer, label: `TARA AGENT · ${response.provider}` };
}
