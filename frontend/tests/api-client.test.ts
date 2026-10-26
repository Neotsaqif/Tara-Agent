import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_BASE_URL,
  ApiError,
  api,
  type DecisionRequest,
} from "../src/api/client";

const fetchMock = vi.fn<typeof fetch>();
const decision: DecisionRequest = {
  state: "pending_approval",
  decision: "reject",
  revision_parameters: {},
};
const validDecision = {
  state: "closed",
  decision: "reject",
  event_id: "event-test",
  revision_parameters: {},
};
function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("API client contract", () => {
  it("loads health from the configured base with an abort signal and JSON accept header", async () => {
    const health = { status: "ok", environment: "test" };
    respond(health);
    await expect(api.health()).resolves.toEqual(health);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/health`,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: { Accept: "application/json" },
      }),
    );
  });

  it.each([
    {
      state: "executing",
      decision: "approve",
      event_id: "approval",
      revision_parameters: {},
    },
    validDecision,
    {
      state: "revision_requested",
      decision: "revise",
      event_id: "revision",
      revision_parameters: { max_discount: "15" },
    },
  ])("accepts a valid $decision decision response", async (response) => {
    respond(response);
    await expect(api.decision(decision)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/workflows/decision`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(decision),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("serializes explicit approval and string revision parameters without substituting demo data", async () => {
    respond(validDecision);
    const body: DecisionRequest = {
      state: "pending_approval",
      decision: "approve",
      approved_by: "test-label",
      revision_parameters: { max_discount: "10" },
    };
    await api.decision(body);
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual(
      body,
    );
  });

  it.each([
    null,
    [],
    {},
    { status: "ok" },
    { status: 1, environment: "test" },
    { status: "ok", environment: null },
  ])("rejects malformed health payload %j", async (body) => {
    respond(body);
    await expect(api.health()).rejects.toMatchObject({
      name: "ApiError",
      status: 200,
      message: expect.stringContaining("Tidak ada data demo pengganti"),
    });
  });

  it.each([
    null,
    [],
    {},
    { ...validDecision, state: "unknown" },
    { ...validDecision, decision: "accept" },
    { ...validDecision, event_id: 12 },
    { ...validDecision, revision_parameters: null },
    { ...validDecision, revision_parameters: [] },
    { ...validDecision, revision_parameters: { max_discount: 15 } },
  ])("rejects malformed decision payload %j", async (body) => {
    respond(body);
    await expect(api.decision(decision)).rejects.toMatchObject({
      name: "ApiError",
      status: 200,
      message: expect.stringContaining("Format respons API"),
    });
  });

  it("rejects successful HTTP responses containing invalid JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new SyntaxError("invalid JSON")),
    } as unknown as Response);
    await expect(api.health()).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining("Format respons API"),
    });
  });

  it.each([
    [
      403,
      "Permintaan ditolak (403). approved_by bukan autentikasi atau bukti izin.",
    ],
    [409, "Transisi tidak sah (409). Periksa state dan parameter revisi."],
    [422, "Data request tidak valid (422). Periksa field dan enum."],
    [500, "API gagal merespons (500)."],
  ])(
    "maps HTTP %i to a safe error without echoing server secrets",
    async (status, message) => {
      respond({ detail: "private-token-and-business-record" }, status);
      await expect(api.decision(decision)).rejects.toEqual(
        new ApiError(status, message),
      );
    },
  );

  it("maps network failures without exposing the original exception", async () => {
    fetchMock.mockRejectedValue(new TypeError("private network address"));
    await expect(api.health()).rejects.toEqual(
      new ApiError(
        0,
        "API tidak dapat dihubungi. Periksa server dan konfigurasi koneksi.",
      ),
    );
  });

  it("aborts a stalled request after eight seconds and clears its timer", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const request = api.health();
    const assertion = expect(request).rejects.toEqual(
      new ApiError(
        0,
        "Permintaan dibatalkan atau melewati batas waktu 8 detik.",
      ),
    );
    await vi.advanceTimersByTimeAsync(7999);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("honors caller cancellation independently of the timeout", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const request = api.health(controller.signal);
    const assertion = expect(request).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("dibatalkan"),
    });
    controller.abort();
    await assertion;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("clears the timeout after a completed request", async () => {
    vi.useFakeTimers();
    respond({ status: "ok", environment: "test" });
    await api.health();
    expect(vi.getTimerCount()).toBe(0);
  });
});
