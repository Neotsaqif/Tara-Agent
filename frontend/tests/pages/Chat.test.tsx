import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Chat from "../../src/pages/Chat";

const fetchMock = vi.fn<typeof fetch>();
const livePayload = {
  session_id: "s-live-1", workflow: "informational", status: "completed",
  answer: "Margin kotor = pendapatan - HPP.", evidence: [], assumptions: [],
  limitations: ["Belum ada dataset terhubung."], needs_approval: false,
  available_actions: [], provider: "mock",
};
beforeEach(() => {
  history.replaceState(null, "", "#chat");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Chat demo behaviour", () => {
  it("shows contextual content and rationale in demo mode", async () => {
    history.replaceState(null, "", "#chat?context=customers");
    const user = userEvent.setup();
    render(<Chat mode="demo" />);
    expect(screen.getByRole("heading", { name: "Tingkatkan loyalitas pelanggan" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Lihat alasan" })[0]);
    expect(within(screen.getByRole("dialog")).getByText(/bukan hasil perhitungan bisnis aktual/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("selects an option using a reversible URL without business approval in demo", async () => {
    const user = userEvent.setup();
    render(<Chat mode="demo" />);
    await user.click(screen.getAllByRole("button", { name: "Setujui" })[1]);
    expect(location.hash).toContain("option=B");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("renders simulation deep links and handles hash changes in demo", () => {
    history.replaceState(null, "", "#chat/simulation/A?context=products&offer=bundle10");
    render(<Chat mode="demo" />);
    expect(screen.getByRole("combobox", { name: "Penawaran" })).toHaveValue("Kopi + pastri · Diskon 10%");
    act(() => { history.replaceState(null, "", "#chat?context=margin"); window.dispatchEvent(new HashChangeEvent("hashchange")); });
    expect(screen.getByRole("heading", { name: "Jaga margin kotor" })).toBeInTheDocument();
  });
  it("does not fabricate responses for unsupported demo context snapshots", () => {
    history.replaceState(null, "", "#chat?context=memory");
    render(<Chat mode="demo" />);
    expect(screen.getByText(/Snapshot rekomendasi untuk konteks ini belum tersedia/)).toBeInTheDocument();
  });
});

describe("Chat live behaviour", () => {
  it("sends the question to /api/v1/agent/chat and renders the real answer", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue(livePayload) } as unknown as Response);
    const user = userEvent.setup();
    render(<Chat mode="live" />);
    const input = screen.getByRole("textbox", { name: "Pertanyaan atau tujuan bisnis" });
    await user.type(input, "Apa itu margin kotor?");
    await user.click(screen.getByRole("button", { name: "Kirim pertanyaan ↑" }));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/agent/chat"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText(/Margin kotor = pendapatan - HPP/)).toBeInTheDocument();
    expect(screen.getByText(/Belum ada dataset terhubung/)).toBeInTheDocument();
  });
  it("preserves the user message and surfaces a safe error when the provider fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: vi.fn().mockResolvedValue({ detail: "down" }) } as unknown as Response);
    const user = userEvent.setup();
    render(<Chat mode="live" />);
    await user.type(screen.getByRole("textbox", { name: "Pertanyaan atau tujuan bisnis" }), "Halo");
    await user.click(screen.getByRole("button", { name: "Kirim pertanyaan ↑" }));
    expect(await screen.findByText(/Layanan AI sedang tidak tersedia/)).toBeInTheDocument();
    expect(screen.getByText("Halo")).toBeInTheDocument();
  });
});
