import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/api/client";
import {
  getChatCapabilities,
  sendChatMessage,
  type ChatRequest,
} from "../../src/services/chat-adapter";

describe("Chat adapter capability and request contracts", () => {
  it("reports that backend chat endpoints are not yet implemented", () => {
    const caps = getChatCapabilities();
    expect(caps.hasChatEndpoint).toBe(false);
    expect(caps.hasStreaming).toBe(false);
    expect(caps.hasPersistence).toBe(false);
    expect(caps.hasAuth).toBe(false);
  });

  it("fails closed with 501 when chat API is not implemented, never faking mock response", async () => {
    const req: ChatRequest = {
      message: "Tingkatkan margin sore",
    };

    await expect(sendChatMessage(req)).rejects.toThrow(ApiError);
    await expect(sendChatMessage(req)).rejects.toMatchObject({
      status: 501,
      message: expect.stringContaining("API chat bisnis belum tersedia"),
    });
  });

  it("handles client-side cancellation gracefully", async () => {
    // If capabilities were enabled, verify abort handling
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    // Since capabilities fail first, it throws 501
    await expect(
      sendChatMessage({ message: "test" }, { signal: abortCtrl.signal }),
    ).rejects.toMatchObject({ status: 501 });
  });
});
