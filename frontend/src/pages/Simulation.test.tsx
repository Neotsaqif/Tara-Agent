import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Simulation from "./Simulation";
import { getDemoSchedule, setDemoSchedule } from "../state/demo-session";

beforeEach(() => {
  history.replaceState(null, "", "#chat");
  setDemoSchedule(null);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Simulation fixture boundaries", () => {
  it("shows the known option A projection and returns through its handler", async () => {
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
    ["Jam", "16.00–18.00", "14.00–17.00"],
  ])(
    "hides all stale projections when %s changes",
    async (label, value, original) => {
      const user = userEvent.setup();
      render(<Simulation optionId="A" onBack={vi.fn()} />);
      const field = screen.getByRole("combobox", { name: label });
      await user.selectOptions(field, value);
      expect(
        screen.getAllByText("Belum tersedia", { exact: true }),
      ).toHaveLength(4);
      expect(
        screen.queryByRole("group", {
          name: "Proyeksi vs pendapatan acuan, data ilustrasi",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Simulasikan penjadwalan" }),
      ).toBeDisabled();
      await user.selectOptions(field, original);
      expect(
        screen.getByRole("group", {
          name: "Proyeksi vs pendapatan acuan, data ilustrasi",
        }),
      ).toBeInTheDocument();
    },
  );
  it.each(["unknown"])(
    "does not invent projections for option %s",
    (optionId) => {
      render(<Simulation optionId={optionId} onBack={vi.fn()} />);
      expect(
        screen.getAllByText("Belum tersedia", { exact: true }),
      ).toHaveLength(4);
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Simulasikan penjadwalan" }),
      ).toBeDisabled();
    },
  );
  it.each([
    [
      "A",
      "bundle10",
      "Variant10PercentPrimary",
      "Kopi + pastri · Diskon 10%",
      "14.00–17.00",
    ],
    [
      "A",
      "bundle20",
      "Variant20PercentPrimary",
      "Kopi + pastri · Diskon 20%",
      "14.00–17.00",
    ],
    [
      "B",
      "loyalty",
      "VariantLoyaltyPrimary",
      "Poin loyalitas 2×",
      "14.00–17.00",
    ],
    [
      "C",
      "reach",
      "VariantReachOfferPrimary",
      "Minuman pilihan · Diskon 20%",
      "14.00–16.00",
    ],
  ])(
    "restores the confirmed option %s snapshot %s and matching parameters",
    (optionId, initialSnapshot, asset, offer, hours) => {
      render(
        <Simulation
          optionId={optionId}
          initialSnapshot={initialSnapshot}
          onBack={vi.fn()}
        />,
      );
      expect(
        screen.getByAltText("Tren ilustrasi dari desain Figma"),
      ).toHaveAttribute("src", `/assets/figma/${asset}.svg`);
      expect(screen.getByRole("combobox", { name: "Penawaran" })).toHaveValue(
        offer,
      );
      expect(screen.getByRole("combobox", { name: "Jam" })).toHaveValue(hours);
      expect(
        screen.queryByRole("combobox", { name: "Snapshot desain Figma" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Rp 27,6 jt")).toBeInTheDocument();
      expect(
        screen.getByText(
          /KPI berulang mengikuti desain Figma, bukan hasil hitung ulang/,
        ),
      ).toBeInTheDocument();
    },
  );
  it("changes actual A offers between supported snapshots without a second selector", async () => {
    const user = userEvent.setup();
    render(<Simulation optionId="A" onBack={vi.fn()} />);
    for (const [offer, asset] of [
      ["Kopi + pastri · Diskon 10%", "Variant10PercentPrimary"],
      ["Kopi + pastri · Diskon 20%", "Variant20PercentPrimary"],
      ["Kopi + pastri · Diskon 15%", "SimulationPrimarySeriesScaleBounds"],
    ]) {
      await user.selectOptions(
        screen.getByRole("combobox", { name: "Penawaran" }),
        offer,
      );
      expect(
        screen.getByAltText("Tren ilustrasi dari desain Figma"),
      ).toHaveAttribute("src", `/assets/figma/${asset}.svg`);
    }
  });
  it.each([
    ["B", "Poin loyalitas 3×"],
    ["C", "Minuman pilihan · Diskon 10%"],
  ])("hides unsupported %s offer projections", async (optionId, offer) => {
    const user = userEvent.setup();
    render(<Simulation optionId={optionId} onBack={vi.fn()} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Penawaran" }),
      offer,
    );
    expect(screen.getAllByText("Belum tersedia", { exact: true })).toHaveLength(
      4,
    );
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
  it.each([
    ["B", "Poin loyalitas 2×", "14.00–17.00"],
    ["C", "Minuman pilihan · Diskon 20%", "14.00–16.00"],
  ])(
    "starts option %s with its own default offer and hours",
    (optionId, offer, hours) => {
      render(<Simulation optionId={optionId} onBack={vi.fn()} />);
      expect(screen.getByRole("combobox", { name: "Penawaran" })).toHaveValue(
        offer,
      );
      expect(screen.getByRole("combobox", { name: "Jam" })).toHaveValue(hours);
      expect(screen.getByRole("group")).toBeInTheDocument();
    },
  );
  it("does not restore projections by changing offer while outlet remains unsupported", async () => {
    const user = userEvent.setup();
    render(<Simulation optionId="A" onBack={vi.fn()} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Outlet sasaran" }),
      "Kampus",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Penawaran" }),
      "Kopi + pastri · Diskon 10%",
    );
    expect(screen.getAllByText("Belum tersedia", { exact: true })).toHaveLength(
      4,
    );
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
  it("rejects a cross-option snapshot deep link", () => {
    render(
      <Simulation optionId="A" initialSnapshot="loyalty" onBack={vi.fn()} />,
    );
    expect(screen.getAllByText("Belum tersedia", { exact: true })).toHaveLength(
      4,
    );
  });
  it("confirms only an in-memory demo schedule", () => {
    vi.useFakeTimers();
    render(<Simulation optionId="A" onBack={vi.fn()} />);
    act(() =>
      screen.getByRole("button", { name: "Simulasikan penjadwalan" }).click(),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Simulasikan penjadwalan promo ini?",
    });
    expect(
      within(dialog).getByText(/Tidak ada campaign dibuat atau dikirim/),
    ).toBeInTheDocument();
    act(() =>
      within(dialog)
        .getByRole("button", { name: "Konfirmasi simulasi" })
        .click(),
    );
    expect(
      screen.getByRole("dialog", { name: "Menjadwalkan promo demo…" }),
    ).toBeInTheDocument();
    expect(getDemoSchedule()).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(
      screen.getByRole("dialog", { name: "Simulasi penjadwalan selesai" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Simulasi selesai; tidak ada campaign dibuat atau dikirim/,
      ),
    ).toBeInTheDocument();
    expect(getDemoSchedule()?.title).toBe("Paket Kopi Sore");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("cancels pending scheduling on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<Simulation optionId="A" onBack={vi.fn()} />);
    act(() =>
      screen.getByRole("button", { name: "Simulasikan penjadwalan" }).click(),
    );
    act(() =>
      screen.getByRole("button", { name: "Konfirmasi simulasi" }).click(),
    );
    unmount();
    act(() => vi.runAllTimers());
    expect(getDemoSchedule()).toBeNull();
  });
});
