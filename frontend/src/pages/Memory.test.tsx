import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Memory from "./Memory";

describe("Memory search", () => {
  it("searches demo notes case-insensitively across descriptions and source metadata", async () => {
    const user = userEvent.setup();
    render(<Memory mode="demo" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "4 catatan demo ditemukan.",
    );
    const search = screen.getByRole("searchbox", { name: "Cari memori AI" });
    await user.type(search, "  STAF  ");
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 catatan demo ditemukan.",
    );
    expect(
      screen.getByRole("button", {
        name: /Kunjungan akhir pekan memuncak pukul 17.00–19.00/,
      }),
    ).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "Ditambahkan Rainer");
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 catatan demo ditemukan.",
    );
  });

  it("shows an empty result and resets the search without removing demo notes", async () => {
    const user = userEvent.setup();
    render(<Memory mode="demo" />);
    const search = screen.getByRole("searchbox", { name: "Cari memori AI" });
    await user.type(search, "no-matching-note");
    expect(
      screen.getByRole("heading", { name: "Tidak ada catatan yang cocok" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "0 catatan demo ditemukan.",
    );
    await user.click(screen.getByRole("button", { name: "Hapus pencarian" }));
    expect(search).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent(
      "4 catatan demo ditemukan.",
    );
  });

  it("opens the selected demo note and restores focus when closed", async () => {
    const user = userEvent.setup();
    render(<Memory mode="demo" />);
    const note = screen.getByRole("button", {
      name: /Paket sore lebih efektif dari diskon satuan/,
    });
    await user.click(note);
    const dialog = screen.getByRole("dialog", {
      name: "Paket sore lebih efektif dari diskon satuan",
    });
    expect(
      within(dialog).getByText(/bukan memori bisnis aktual/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Diskusi dengan AI" }),
    ).toHaveAttribute("href", "#chat");
    await user.click(
      within(dialog).getByRole("button", { name: "Tutup catatan" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(note).toHaveFocus();
  });

  it("hides demo results and any selected note when switched to live mode", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Memory mode="demo" />);
    await user.click(
      screen.getByRole("button", { name: /Batasi diskon promo di bawah 20%/ }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    rerender(<Memory mode="live" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Memori AI belum tersedia" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /Batasi diskon promo di bawah 20%/,
      }),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("searchbox", { name: "Cari memori AI" }),
      "margin",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pencarian memerlukan API memori yang belum tersedia.",
    );
    rerender(<Memory mode="demo" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
