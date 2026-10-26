import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Analytics from "./Analytics";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("Analytics navigation and demo boundaries", () => {
  it("supports wrapping arrow keys, Home, and End with selected tab and focus kept together", async () => {
    const user = userEvent.setup();
    render(<Analytics mode="demo" />);
    const product = screen.getByRole("tab", { name: "Produk" });
    product.focus();
    expect(product).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Produk" })).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    const customer = screen.getByRole("tab", { name: "Pelanggan" });
    expect(customer).toHaveFocus();
    expect(customer).toHaveAttribute("aria-selected", "true");
    expect(customer).toHaveAttribute("tabindex", "0");
    expect(product).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel", { name: "Pelanggan" })).toBeInTheDocument();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Musiman" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Musiman" })).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(product).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Musiman" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(product).toHaveFocus();
    expect(product).toHaveAttribute("aria-selected", "true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["Periode analitik", "1–31 Agu 2026", "1–13 Sep 2026"],
    ["Outlet analitik", "Kampus", "Semua Outlet"],
    ["Kategori analitik", "Kopi", "Semua kategori"],
  ])("hides unsupported demo data and disables export when %s changes", async (label, value, original) => {
    const user = userEvent.setup();
    render(<Analytics mode="demo" />);
    expect(screen.getByRole("button", { name: "Ekspor laporan" })).toBeEnabled();
    expect(screen.getByRole("region", { name: "Kinerja produk" })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: label }), value);
    expect(screen.getByRole("heading", { name: "Tidak ada data demo untuk filter ini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ekspor laporan" })).toBeDisabled();
    expect(screen.queryByRole("region", { name: "Kinerja produk" })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: label }), original);
    expect(screen.getByRole("region", { name: "Kinerja produk" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ekspor laporan" })).toBeEnabled();
  });

  it("opens product details as illustrative data and clears the modal when changing mode", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Analytics mode="demo" />);
    await user.click(screen.getByRole("button", { name: /^Latte Es 68%/ }));
    const dialog = screen.getByRole("dialog", { name: "Latte Es" });
    expect(within(dialog).getByText(/Tidak ada harga yang diubah/)).toBeInTheDocument();
    rerender(<Analytics mode="live" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Data analitik belum tersedia" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ekspor laporan" })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("toggles a clearly labeled local comparison notice", async () => {
    const user = userEvent.setup();
    render(<Analytics mode="demo" />);
    const comparison = screen.getByRole("button", { name: "Bandingkan periode sebelumnya" });
    expect(comparison).toHaveAttribute("aria-pressed", "false");
    await user.click(comparison);
    expect(comparison).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Rincian periode sebelumnya belum tersedia/)).toBeInTheDocument();
    await user.click(comparison);
    expect(screen.queryByText(/Rincian periode sebelumnya belum tersedia/)).not.toBeInTheDocument();
  });
});
