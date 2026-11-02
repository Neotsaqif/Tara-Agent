import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";

beforeEach(() => {
  history.replaceState(null, "", "#chat");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});
afterEach(() => vi.unstubAllGlobals());
describe("workspace isolation", () => {
  it("clears live chat state across a mode cycle", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      json: vi.fn().mockResolvedValue({
        session_id: "s1", workflow: "informational", status: "completed",
        answer: "Jawaban live.", evidence: [], assumptions: [],
        limitations: [], needs_approval: false, available_actions: [], provider: "mock",
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByRole("textbox", { name: "Pertanyaan atau tujuan bisnis" }),
      "Pertanyaan live",
    );
    await user.click(screen.getByRole("button", { name: "Kirim pertanyaan ↑" }));
    await user.click(screen.getByRole("button", { name: "Demo Figma" }));
    await user.click(screen.getByRole("button", { name: "API nyata" }));
    expect(screen.queryByText("Jawaban live.")).not.toBeInTheDocument();
  });
  it("handles invalid routes instead of rendering overview", () => {
    history.replaceState(null, "", "#monitoring/unknown");
    render(<App />);
    expect(screen.getByText("Halaman tidak ditemukan")).toBeInTheDocument();
    expect(
      screen.queryByText("Sekilas kinerja bisnis Anda"),
    ).not.toBeInTheDocument();
  });
  it("gates unsupported workspace scopes instead of retaining misleading fixtures", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Demo Figma" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Outlet ruang kerja" }),
      "Kampus",
    );
    expect(
      screen.getByText("Fixture scope belum tersedia"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Pertanyaan atau tujuan bisnis" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "API nyata" }));
    expect(
      screen.getByRole("combobox", { name: "Outlet ruang kerja" }),
    ).toHaveValue("Semua Outlet");
  });
  it("clears completed monitoring transitions across a mode cycle", async () => {
    history.replaceState(null, "", "#monitoring/afternoon");
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Demo Figma" }));
    await user.click(
      screen.getAllByRole("button", { name: "Batalkan Promo" })[0],
    );
    const confirm = screen
      .getByRole("dialog")
      .querySelector<HTMLButtonElement>(".danger");
    expect(confirm).not.toBeNull();
    await user.click(confirm!);
    await screen.findByText(/Demo: jadwal dibatalkan secara lokal/);
    await user.click(screen.getByRole("button", { name: "API nyata" }));
    await user.click(screen.getByRole("button", { name: "Demo Figma" }));
    expect(
      screen.getAllByRole("button", { name: "Batalkan Promo" })[0],
    ).toBeEnabled();
    expect(
      screen.queryByText(/Demo: jadwal dibatalkan secara lokal/),
    ).not.toBeInTheDocument();
  });
  it("tracks contextual hash changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Demo Figma" }));
    act(() => {
      location.hash = "#chat?context=products";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(
      screen.getByRole("heading", {
        name: "Tingkatkan kinerja produk",
        level: 2,
      }),
    ).toBeInTheDocument();
  });
});
