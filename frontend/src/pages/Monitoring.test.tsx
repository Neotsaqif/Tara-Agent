import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Monitoring from "./Monitoring";

function open(hash: string) {
  history.replaceState(null, "", `#${hash}`);
  return render(<Monitoring mode="demo" />);
}
async function advance() {
  await act(async () => {
    vi.advanceTimersByTime(850);
  });
}
beforeEach(() => {
  history.replaceState(null, "", "#monitoring");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Monitoring Figma demo", () => {
  it("filters by typed outlet and status and resets an empty result", async () => {
    const user = userEvent.setup();
    open("monitoring");
    await user.click(
      screen.getByRole("button", { name: "Reset demo pemantauan" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Outlet promo" }),
      "campus",
    );
    expect(
      screen.queryByRole("heading", { name: "Promo Akhir Pekan" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Paket Hemat Siang" }),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Status promo" }),
      "deviation",
    );
    expect(
      screen.getByRole("heading", { name: "Tidak ada promo yang cocok" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filter" }));
    expect(
      screen.getByRole("heading", { name: "Promo Akhir Pekan" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Selesai" })).toHaveAttribute(
      "href",
      "#monitoring/completed",
    );
    expect(
      screen.getByRole("heading", { name: "Aktivitas terbaru" }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "weekend",
      "Promo Akhir Pekan",
      "Rp 19,2 jt",
      "Periode lebih singkat bisa lebih efektif",
    ],
    [
      "lunch",
      "Paket Hemat Siang",
      "Rp 24,5 jt",
      "Kinerja promo siang sesuai target",
    ],
    [
      "afternoon",
      "Paket Kopi Sore",
      "Rp 27,6 jt",
      "Promo Anda sudah dijadwalkan",
    ],
  ])(
    "renders campaign-specific %s fixtures",
    (id, title, metric, narrative) => {
      open(`monitoring/${id}`);
      expect(
        screen.getByRole("heading", { name: title, level: 1 }),
      ).toBeInTheDocument();
      expect(screen.getByText(metric, { exact: true })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: narrative }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Riwayat" }),
      ).toBeInTheDocument();
      expect(screen.getByText("±10% dari prediksi")).toBeInTheDocument();
      if (id !== "weekend")
        expect(
          screen.queryByText("Peringatan deviasi muncul"),
        ).not.toBeInTheDocument();
      if (id === "lunch")
        expect(
          screen.getByRole("heading", { name: "Grafik aktual belum tersedia" }),
        ).toBeInTheDocument();
      if (id === "afternoon")
        expect(
          screen.getByRole("group", {
            name: "Prediction vs acuan, data ilustrasi",
          }),
        ).toBeInTheDocument();
    },
  );

  it.each([
    [
      "weekend?view=adjusted",
      "Waktu lebih tepat, proyeksi lebih baik.",
      "Rp 19,7 jt",
    ],
    ["weekend?view=stopped", "Promo dihentikan", "Rp 21,0 jt"],
    ["weekend?view=stopped-adjusted", "Promo dihentikan", "Rp 19,7 jt"],
    ["lunch?view=stopped", "Promo dihentikan", "Rp 24,5 jt"],
    ["afternoon?view=cancelled", "Jadwal promo dibatalkan", "Rp 27,6 jt"],
  ])("supports exact fixture variant %s", (path, title, metric) => {
    open(`monitoring/${path}`);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(metric)).toBeInTheDocument();
  });

  it("rethink and adjustment are cancellable local progress and result states", async () => {
    vi.useFakeTimers();
    const fetch = vi.spyOn(globalThis, "fetch");
    open("monitoring/weekend");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Tinjau Ulang dengan AI" })[0],
    );
    expect(
      screen.getByRole("dialog", { name: "Command AI sedang meninjau…" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Batalkan proses demo" }),
    );
    await advance();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Tinjau Ulang dengan AI" })[0],
    );
    await advance();
    fireEvent.click(
      screen.getByRole("button", { name: "Terapkan Rekomendasi · Demo" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Menerapkan rekomendasi demo…" }),
    ).toBeInTheDocument();
    await advance();
    expect(screen.getByText("Rp 19,7 jt")).toBeInTheDocument();
    expect(
      screen.getByText(/Demo: penyesuaian diterapkan secara lokal/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Hentikan Promo" })[0],
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Hentikan Promo · Demo",
      }),
    );
    await advance();
    expect(
      screen.getByRole("heading", { name: "Promo dihentikan" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rp 19,7 jt")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Dihentikan" })[0],
    ).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Reset demo pemantauan" }),
    );
  });

  it.each(["afternoon", "lunch"])(
    "confirms %s stop/cancel without changing another campaign",
    async (id) => {
      vi.useFakeTimers();
      open(`monitoring/${id}`);
      const cancel = id === "afternoon";
      fireEvent.click(
        screen.getAllByRole("button", {
          name: cancel ? "Batalkan Promo" : "Hentikan Promo",
        })[0],
      );
      const dialog = screen.getByRole("dialog");
      fireEvent.click(
        within(dialog).getByRole("button", {
          name: cancel ? "Batalkan Promo · Demo" : "Hentikan Promo · Demo",
        }),
      );
      await advance();
      expect(
        screen.getByRole("heading", {
          name: cancel ? "Jadwal promo dibatalkan" : "Promo dihentikan",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(cancel ? "Rp 27,6 jt" : "Rp 24,5 jt"),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Reset demo pemantauan" }),
      );
    },
  );

  it("opens scheduled review with afternoon chat context", async () => {
    const user = userEvent.setup();
    open("monitoring/afternoon");
    await user.click(
      screen.getAllByRole("button", { name: "Tinjau Ulang dengan AI" })[0],
    );
    const dialog = screen.getByRole("dialog", {
      name: "Tinjau strategi yang disetujui",
    });
    expect(
      within(dialog).getByRole("link", { name: "Tinjau Simulasi" }),
    ).toHaveAttribute("href", "#chat?context=afternoon");
    await user.click(
      within(dialog).getByRole("button", { name: "Pertahankan Strategi" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    ["morning", "Kopi Pagi", "+Rp 6,4 jt"],
    ["payday", "Promo Gajian", "+Rp 8,2 jt"],
    ["pastry", "Pekan Pastri", "+Rp 4,8 jt"],
  ])(
    "deep links completed %s results without invented metrics",
    (id, title, impact) => {
      open(`monitoring/${id}`);
      expect(
        screen.getByRole("heading", { name: title, level: 1 }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`Pendapatan tambahan: ${impact}`),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Bahas hasil dengan AI" }),
      ).toHaveAttribute("href", "#chat?context=weekend");
      expect(
        screen.queryByRole("button", { name: "Hentikan Promo" }),
      ).not.toBeInTheDocument();
    },
  );

  it("uses completed URL for the completed list", () => {
    open("monitoring/completed");
    expect(
      screen.getByRole("heading", { name: "Belajar dari setiap promo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Lihat Pemantauan → Kopi Pagi" }),
    ).toHaveAttribute("href", "#monitoring/morning");
  });

  it("cancels a pending timer on unmount", async () => {
    vi.useFakeTimers();
    const { unmount } = open("monitoring/weekend");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Tinjau Ulang dengan AI" })[0],
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    await advance();
  });

  it("keeps live free of fixtures and business actions", () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    location.hash = "monitoring/weekend?view=adjusted";
    render(<Monitoring mode="live" />);
    expect(
      screen.getByRole("heading", { name: "Belum ada data aktual" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Rp 19,7 jt")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
