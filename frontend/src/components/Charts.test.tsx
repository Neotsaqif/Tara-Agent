import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BarChart, LineChart } from "./Charts";

describe("Figma chart snapshots", () => {
  it("shows exact revenue values with keyboard and dismisses with Escape", async () => {
    const user = userEvent.setup();
    render(<LineChart title="Revenue" subtitle="Demo" />);
    await user.tab();
    expect(screen.getByText("Rp 13,2 jt")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Rp 13,2 jt")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Lihat titik 07 Sep" }),
    );
    expect(screen.getByText("Rp 21,4 jt")).toBeInTheDocument();
  });
  it("uses only available weekly point values", async () => {
    const user = userEvent.setup();
    render(<BarChart />);
    await user.click(
      screen.getByRole("button", { name: "Kam, lihat rincian ilustrasi" }),
    );
    expect(screen.getByText("Rp 22,5 jt")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Sel, lihat rincian ilustrasi" }),
    );
    expect(
      screen.getByText("Nilai titik belum tersedia; grafik ilustrasi"),
    ).toBeInTheDocument();
  });
});
