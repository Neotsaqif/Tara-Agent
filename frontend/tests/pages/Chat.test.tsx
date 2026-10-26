import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Chat from "../../src/pages/Chat";

beforeEach(() => {
  history.replaceState(null, "", "#chat");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Chat local and demo boundaries", () => {
  it("keeps demo recommendations out of live mode, including simulation deep links", () => {
    history.replaceState(null, "", "#chat/simulation/A");
    render(<Chat mode="live" />);
    expect(
      screen.getByText(/Pertanyaan di bawah hanya menjadi draft lokal/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Setujui" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Belum ada data konteks")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("saves a trimmed local draft without an AI response or request", async () => {
    const user = userEvent.setup();
    render(<Chat mode="live" />);
    const input = screen.getByRole("textbox", {
      name: "Pertanyaan atau tujuan bisnis",
    });
    const submit = screen.getByRole("button", { name: "Simpan draft ↑" });
    expect(submit).toBeDisabled();
    await user.type(input, "  Tingkatkan penjualan  ");
    await user.click(submit);
    expect(
      screen.getByText("Draft lokal: Tingkatkan penjualan"),
    ).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(submit).toBeDisabled();
    expect(
      screen.getByText(
        /tidak ada jawaban AI atau rekomendasi baru yang dibuat/,
      ),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("explains unavailable live context", async () => {
    const user = userEvent.setup();
    render(<Chat mode="live" />);
    await user.click(screen.getByRole("button", { name: "＋ Tambah konteks" }));
    expect(
      screen.getByText(
        /Konteks outlet, periode, dan data transaksi belum dapat dilampirkan/,
      ),
    ).toBeInTheDocument();
  });
  it("shows contextual content and rationale", async () => {
    history.replaceState(null, "", "#chat?context=customers");
    const user = userEvent.setup();
    render(<Chat mode="demo" />);
    expect(
      screen.getByRole("heading", { name: "Tingkatkan loyalitas pelanggan" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Pelanggan sesekali punya potensi pertumbuhan terbesar/),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Lihat alasan ⌄" })[0],
    );
    expect(
      within(screen.getByRole("dialog")).getByText(
        /bukan hasil perhitungan bisnis aktual/,
      ),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("selects an option using a reversible URL, without business approval", async () => {
    const user = userEvent.setup();
    render(<Chat mode="demo" />);
    await user.click(screen.getAllByRole("button", { name: "Setujui" })[1]);
    expect(location.hash).toContain("option=B");
    expect(screen.getByRole("button", { name: "Dipilih ✓" })).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Simulasikan B" }));
    expect(
      screen.getByRole("heading", { name: "Simulasikan sebelum menyetujui" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Kembali ke Chat AI" }),
    );
    expect(location.hash).toContain("option=B");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("renders simulation deep links and handles browser hash changes", () => {
    history.replaceState(
      null,
      "",
      "#chat/simulation/A?context=products&offer=bundle10",
    );
    render(<Chat mode="demo" />);
    expect(screen.getByRole("combobox", { name: "Penawaran" })).toHaveValue(
      "Kopi + pastri · Diskon 10%",
    );
    act(() => {
      history.replaceState(null, "", "#chat?context=margin");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(
      screen.getByRole("heading", { name: "Jaga margin kotor" }),
    ).toBeInTheDocument();
  });
  it("does not fabricate responses for unsupported context snapshots", () => {
    history.replaceState(null, "", "#chat?context=memory");
    render(<Chat mode="demo" />);
    expect(
      screen.getByText(/Snapshot rekomendasi untuk konteks ini belum tersedia/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Setujui" }),
    ).not.toBeInTheDocument();
  });
  it("cancels the demo thinking timer on mode change", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Chat mode="demo" />);
    act(() =>
      screen.getByRole("button", { name: "Putar ulang respons demo" }).click(),
    );
    expect(
      screen.getByText(/Pemutaran snapshot demo, bukan proses LLM/),
    ).toBeInTheDocument();
    rerender(<Chat mode="live" />);
    act(() => vi.runAllTimers());
    expect(screen.queryByText(/Meninjau penjualan/)).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
