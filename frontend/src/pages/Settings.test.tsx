import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Settings from "./Settings";

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

describe("Settings local preview", () => {
  it("previews changed local fields and risk without saving to the server", async () => {
    const user = userEvent.setup();
    render(<Settings mode="demo" />);
    const business = screen.getByRole("textbox", { name: "Nama bisnis" });
    await user.clear(business);
    await user.type(business, "Test Café");
    const margin = screen.getByRole("spinbutton", { name: "Batas minimum margin (%)" });
    await user.clear(margin);
    await user.type(margin, "65");
    await user.click(screen.getByRole("radio", { name: "Konservatif Jaga margin dan batasi risiko." }));
    await user.click(screen.getByRole("button", { name: "Pratinjau Perubahan" }));
    const dialog = screen.getByRole("dialog", { name: "Pratinjau perubahan lokal" });
    expect(within(dialog).getByText("Test Café", { exact: true })).toBeInTheDocument();
    expect(within(dialog).getByText("65%", { exact: true })).toBeInTheDocument();
    expect(within(dialog).getByText("Konservatif", { exact: true })).toBeInTheDocument();
    expect(within(dialog).getByText(/Belum disimpan ke server/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Kembali mengedit" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(business).toHaveValue("Test Café");
    expect(margin).toHaveValue(65);
  });

  it("uses browser validation to block an empty business name and out-of-range thresholds", async () => {
    const user = userEvent.setup();
    render(<Settings mode="live" />);
    const business = screen.getByRole("textbox", { name: "Nama bisnis" });
    await user.click(screen.getByRole("button", { name: "Pratinjau Perubahan" }));
    expect(business).toBeInvalid();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.type(business, "Test Business");
    const deviation = screen.getByRole("spinbutton", { name: "Deviasi pendapatan (±%)" });
    await user.clear(deviation);
    await user.type(deviation, "101");
    await user.click(screen.getByRole("button", { name: "Pratinjau Perubahan" }));
    expect(deviation).toBeInvalid();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("explains integration and invitation limitations instead of mutating external state", async () => {
    const user = userEvent.setup();
    render(<Settings mode="demo" />);
    await user.click(screen.getAllByRole("button", { name: "Detail koneksi" })[0]);
    let dialog = screen.getByRole("dialog", { name: "Fitur belum terhubung" });
    expect(within(dialog).getByText(/Kasir belum terhubung/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Mengerti" }));
    await user.click(screen.getByRole("button", { name: "Tentang undangan" }));
    dialog = screen.getByRole("dialog", { name: "Fitur belum terhubung" });
    expect(within(dialog).getByText(/Tidak ada undangan yang dikirim atau izin yang diubah/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resets demo profile and users when switching to live mode", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Settings mode="demo" />);
    expect(screen.getByRole("textbox", { name: "Nama bisnis" })).toHaveValue("Command Demo Café");
    expect(screen.getByRole("region", { name: "Ilustrasi pengguna dan akses" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pratinjau Perubahan" }));
    rerender(<Settings mode="live" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nama bisnis" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Kategori bisnis" })).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Ilustrasi pengguna dan akses" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Daftar pengguna belum tersedia" })).toBeInTheDocument();
  });
});
