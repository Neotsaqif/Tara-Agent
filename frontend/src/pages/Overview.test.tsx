import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Overview from "./Overview";

describe("Overview demo interactions", () => {
  it("shows the exact Saturday heatmap snapshot and closes it", async () => {
    const user = userEvent.setup();
    render(<Overview mode="demo" />);
    await user.click(
      screen.getByRole("button", {
        name: "Sab pukul 18.00: 124 transaksi ilustrasi",
      }),
    );
    expect(screen.getByText("Sabtu · 18.00")).toBeInTheDocument();
    expect(screen.getByText("Pendapatan: Rp 6,8 jt")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tutup ×" }));
    expect(screen.queryByText("Pendapatan: Rp 6,8 jt")).not.toBeInTheDocument();
  });
  it("transfers the afternoon context", async () => {
    const user = userEvent.setup();
    render(<Overview mode="demo" />);
    await user.click(
      screen.getByRole("button", { name: "Analisis dengan AI →" }),
    );
    expect(location.hash).toBe("#chat?context=afternoon");
  });
});
