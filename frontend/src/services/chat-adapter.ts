import { ApiError, API_BASE_URL } from "../api/client";
import type {
  ChatMessage,
  RecommendationOption,
} from "../components/chat/types";

export type ChatRequest = {
  conversationId?: string;
  caseId?: string;
  message: string;
  context?: {
    outletId?: string;
    dateRange?: string;
  };
};

export type ChatApiResponse = {
  conversationId: string;
  caseId?: string;
  message: ChatMessage;
  timestamp: string;
};

export type ChatAdapterCapabilities = {
  hasChatEndpoint: boolean;
  hasStreaming: boolean;
  hasPersistence: boolean;
  hasAuth: boolean;
};

/**
 * Checks whether the backend supports real Chat AI endpoints.
 * Currently returns false because only health and workflow decision sandboxes exist.
 */
export function getChatCapabilities(): ChatAdapterCapabilities {
  return {
    hasChatEndpoint: false,
    hasStreaming: false,
    hasPersistence: false,
    hasAuth: false,
  };
}

/**
 * Send a chat request to the backend.
 * Aborts on timeout (default 8s) or caller signal.
 * Fails closed when backend endpoints are unavailable, rather than silently falling back to mock data.
 */
export async function sendChatMessage(
  request: ChatRequest,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
  },
): Promise<ChatApiResponse> {
  const capabilities = getChatCapabilities();
  if (!capabilities.hasChatEndpoint) {
    throw new ApiError(
      501,
      "API chat bisnis belum tersedia di server. Pertanyaan tidak dapat diproses oleh LLM nyata.",
    );
  }

  const timeoutMs = options?.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options?.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Panggilan chat gagal dengan status ${response.status}`,
      );
    }

    const data = (await response.json()) as ChatApiResponse;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (signal.aborted) {
      throw new ApiError(
        408,
        "Permintaan chat melampaui batas waktu (timeout).",
      );
    }
    throw new ApiError(0, "Gagal terhubung ke layanan chat backend.");
  }
}
