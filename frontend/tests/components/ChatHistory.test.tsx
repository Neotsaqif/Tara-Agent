import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ChatHistory from "../../src/components/ChatHistory";

describe("fixture conversation history", () => {
  it("filters fixture routes and expands the full static list", async () => {
    const user = userEvent.setup();
    render(<ChatHistory mode="demo" />);
    expect(
      screen.getByRole("link", { name: "Tingkatkan penjualan sore" }),
    ).toHaveAttribute("href", "#chat?context=afternoon");
    await user.type(
      screen.getByRole("searchbox", { name: "Cari chat" }),
      "margin",
    );
    expect(
      screen.getByRole("link", { name: "Tingkatkan margin produk" }),
    ).toHaveAttribute("href", "#chat?context=margin");
    expect(
      screen.queryByRole("link", { name: "Tingkatkan penjualan sore" }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await user.click(
      screen.getByRole("button", { name: "Lihat semua percakapan" }),
    );
    expect(
      screen.getByRole("link", { name: "Tingkatkan loyalitas pelanggan" }),
    ).toHaveAttribute("href", "#chat?context=customers");
  });
  it("does not present fixture history as real stored conversations", () => {
    render(<ChatHistory mode="live" />);
    expect(
      screen.getByText("Riwayat belum tersimpan di server."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Tingkatkan margin produk" }),
    ).not.toBeInTheDocument();
  });
});
