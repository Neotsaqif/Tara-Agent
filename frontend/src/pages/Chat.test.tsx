import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Chat from "./Chat";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("Chat local and demo boundaries", () => {
  it("keeps recommendations and simulated business context out of live mode", () => {
    render(<Chat mode="live" />);
    expect(screen.getByText(/Pertanyaan di bawah hanya menjadi draft lokal/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simulasikan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Setujui" })).not.toBeInTheDocument();
    expect(screen.getByText("Belum ada data konteks")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("disables empty drafts, trims and clears submitted input, and makes no API request", async () => {
    const user = userEvent.setup();
    render(<Chat mode="live" />);
    const input = screen.getByRole("textbox", { name: "Pertanyaan atau tujuan bisnis" });
    const submit = screen.getByRole("button", { name: "Simpan draft ↑" });
    expect(submit).toBeDisabled();
    await user.type(input, "   ");
    expect(submit).toBeDisabled();
    await user.clear(input);
    await user.type(input, "  Tingkatkan penjualan  ");
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(screen.getByText("Draft lokal: Tingkatkan penjualan", { exact: true })).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(submit).toBeDisabled();
    expect(screen.getByText(/tidak ada jawaban AI atau rekomendasi baru yang dibuat/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("explains that adding context cannot attach unavailable server data", async () => {
    const user = userEvent.setup();
    render(<Chat mode="live" />);
    await user.click(screen.getByRole("button", { name: "＋ Tambah konteks" }));
    expect(screen.getByText(/Konteks outlet, periode, dan data transaksi belum dapat dilampirkan/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows demo recommendations and opens rationale without approving a campaign", async () => {
    const user = userEvent.setup();
    render(<Chat mode="demo" />);
    expect(screen.getAllByRole("button", { name: "Simulasikan" })).toHaveLength(3);
    await user.click(screen.getAllByRole("button", { name: "Lihat alasan ⌄" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Mengapa A unggul" });
    expect(within(dialog).getByText(/bukan hasil perhitungan bisnis aktual/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Kembali ke chat" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("routes demo approval to a disclaimer and simulation, not the decision API", async () => {
    const user = userEvent.setup();
    render(<Chat mode="demo" />);
    await user.click(screen.getAllByRole("button", { name: "Setujui" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Persetujuan bisnis belum tersedia" });
    expect(within(dialog).getByText(/Tombol ini tidak menyetujui atau menjalankan promo/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Tinjau simulasi demo" }));
    expect(screen.getByRole("heading", { name: "Simulasikan sebelum menyetujui" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kembali ke Chat AI" }));
    expect(screen.getByRole("heading", { name: "Mitra bisnis AI Anda" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not keep the simulation visible when switched to live mode", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Chat mode="demo" />);
    await user.click(screen.getAllByRole("button", { name: "Simulasikan" })[0]);
    expect(screen.getByRole("heading", { name: "Simulasikan sebelum menyetujui" })).toBeInTheDocument();
    rerender(<Chat mode="live" />);
    expect(screen.queryByRole("heading", { name: "Simulasikan sebelum menyetujui" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simulasikan" })).not.toBeInTheDocument();
  });
});
