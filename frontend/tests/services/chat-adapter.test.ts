import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/api/client";
import { getChatCapabilities, sendChatMessage, type ChatRequest } from "../../src/services/chat-adapter";

const fetchMock = vi.fn<typeof fetch>();
const basePayload = {
  session_id: "s1", workflow: "informational", status: "completed", answer: "halo",
  evidence: [], assumptions: [], limitations: [], needs_approval: false,
  available_actions: [], provider: "mock",
};
function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: vi.fn().mockResolvedValue(body) } as unknown as Response);
}
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("Chat adapter", () => {
  it("reports the chat endpoint as available (not hardcoded off)", () => {
    const caps = getChatCapabilities();
    expect(caps.hasChatEndpoint).toBe(true);
    expect(caps.hasStreaming).toBe(false);
  });
  it("posts to /api/v1/agent/chat and returns the validated body", async () => {
    respond(basePayload);
    const req: ChatRequest = { message: "Apa itu margin?" };
    await expect(sendChatMessage(req)).resolves.toEqual(basePayload);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agent/chat"),
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Accept: "application/json" }) }),
    );
  });
  it("rejects empty input client-side before any network call", async () => {
    await expect(sendChatMessage({ message: "   " })).rejects.toMatchObject({ status: 422 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("maps a 503 provider failure to a safe message", async () => {
    respond({ detail: "down" }, 503);
    await expect(sendChatMessage({ message: "halo" })).rejects.toMatchObject({ status: 503, message: expect.stringContaining("tidak tersedia") });
  });
  it("rejects malformed responses without leaking server payloads", async () => {
    respond({ detail: "private", answer: "ok" });
    await expect(sendChatMessage({ message: "halo" })).rejects.toMatchObject({ message: expect.stringContaining("kontrak") });
  });
  it("honours caller cancellation without retrying", async () => {
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const controller = new AbortController();
    const promise = sendChatMessage({ message: "halo" }, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ status: 408 });
  });
});
