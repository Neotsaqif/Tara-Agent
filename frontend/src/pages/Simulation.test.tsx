import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Simulation from "./Simulation";

describe("Simulation projection boundaries", () => {
  it("shows the known option A projection and returns through the supplied handler", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<Simulation optionId="A" onBack={onBack} />);
    expect(
      screen.getByRole("group", {
        name: "Proyeksi vs pendapatan acuan, data ilustrasi",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Kembali ke Chat AI" }),
    );
    expect(onBack).toHaveBeenCalledOnce();
  });

  it.each([
    ["Periode promo", "14–27 Sep 2026", "14–20 Sep 2026"],
    ["Outlet sasaran", "Kampus", "Semua 3 outlet"],
    ["Penawaran", "Kopi + pastri · Diskon 10%", "Kopi + pastri · Diskon 15%"],
    ["Jam", "16.00–18.00", "14.00–17.00"],
  ])(
    "invalidates projections when %s changes and restores only the original fixture",
    async (label, value, original) => {
      const user = userEvent.setup();
      render(<Simulation optionId="A" onBack={vi.fn()} />);
      const field = screen.getByRole("combobox", { name: label });
      await user.selectOptions(field, value);
      expect(
        screen.getByText(/Parameter berubah. API simulasi belum tersedia/),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("group", {
          name: "Proyeksi vs pendapatan acuan, data ilustrasi",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getAllByText("Belum tersedia", { exact: true }),
      ).toHaveLength(4);
      expect(
        screen.getByText(
          /Tidak ada kalkulasi bisnis atau tingkat keyakinan yang dibuat di browser/,
        ),
      ).toBeInTheDocument();
      await user.selectOptions(field, original);
      expect(
        screen.getByRole("group", {
          name: "Proyeksi vs pendapatan acuan, data ilustrasi",
        }),
      ).toBeInTheDocument();
    },
  );

  it.each(["B", "C"])(
    "does not invent revenue or confidence projections for option %s",
    (optionId) => {
      render(<Simulation optionId={optionId} onBack={vi.fn()} />);
      expect(
        screen.queryByRole("group", {
          name: "Proyeksi vs pendapatan acuan, data ilustrasi",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getAllByText("Belum tersedia", { exact: true }),
      ).toHaveLength(3);
      expect(
        screen.getByText(
          /Tidak ada kalkulasi bisnis atau tingkat keyakinan yang dibuat di browser/,
        ),
      ).toBeInTheDocument();
    },
  );

  it("shows edited terms in a scheduling dialog while confirmation remains disabled", async () => {
    const user = userEvent.setup();
    render(<Simulation optionId="A" onBack={vi.fn()} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Outlet sasaran" }),
      "Riverside",
    );
    await user.click(
      screen.getByRole("button", { name: "Tinjau penjadwalan" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Jadwalkan promo ini?" });
    expect(
      within(dialog).getByText("Riverside", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Belum tersedia", { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Konfirmasi Promo" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByText(
        /Penjadwalan dinonaktifkan, bukan dianggap berhasil/,
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Batal" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Outlet sasaran" }),
    ).toHaveValue("Riverside");
  });
});
