import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AiBubble,
  ChatComposer,
  UserBubble,
  type AiTextMessage,
  type UserMessage,
} from "../../src/components/chat";

describe("UserBubble", () => {
  it("renders user text correctly", () => {
    const msg: UserMessage = {
      type: "user",
      id: "u1",
      content: "Bagaimana cara menaikkan margin?",
    };
    render(<UserBubble message={msg} />);
    expect(
      screen.getByText("Bagaimana cara menaikkan margin?"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("user-bubble")).toHaveClass("user-message");
  });

  it("indicates when message is a local draft", () => {
    const msg: UserMessage = {
      type: "user",
      id: "u2",
      content: "Draft ide baru",
      isDraft: true,
    };
    render(<UserBubble message={msg} />);
    expect(screen.getByText("Draft lokal: Draft ide baru")).toBeInTheDocument();
  });
});

describe("AiBubble", () => {
  it("renders AI text response with hierarchy", () => {
    const msg: AiTextMessage = {
      type: "ai_text",
      id: "ai1",
      content: "Berikut analisis penjualan...",
      label: "Command AI · Simulasi",
    };
    render(<AiBubble message={msg} />);
    expect(screen.getByText("Command AI · Simulasi")).toBeInTheDocument();
    expect(
      screen.getByText("Berikut analisis penjualan..."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ai-bubble")).toBeInTheDocument();
  });

  it("renders loading state with status role", () => {
    const msg: AiTextMessage = {
      type: "ai_text",
      id: "ai2",
      content: "Meninjau data...",
      status: "loading",
    };
    render(<AiBubble message={msg} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByText(/Pemutaran snapshot demo, bukan proses LLM/),
    ).toBeInTheDocument();
  });

  it("renders error state with alert role", () => {
    const msg: AiTextMessage = {
      type: "ai_text",
      id: "ai3",
      content: "Fallback content",
      errorMessage: "Gagal memuat tanggapan",
      status: "error",
    };
    render(<AiBubble message={msg} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Gagal memuat tanggapan")).toBeInTheDocument();
  });
});

describe("ChatComposer", () => {
  it("disables submit when empty and enables with trimmed input", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<ChatComposer onSubmitDraft={handleSubmit} />);

    const submitBtn = screen.getByRole("button", { name: "Simpan draft ↑" });
    const textarea = screen.getByRole("textbox", {
      name: "Pertanyaan atau tujuan bisnis",
    });

    expect(submitBtn).toBeDisabled();

    await user.type(textarea, "   ");
    expect(submitBtn).toBeDisabled();

    await user.type(textarea, "Pertanyaan baru");
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledWith("Pertanyaan baru");
    expect(textarea).toHaveValue("");
    expect(submitBtn).toBeDisabled();
  });

  it("prevents double submission", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<ChatComposer onSubmitDraft={handleSubmit} />);

    const textarea = screen.getByRole("textbox", {
      name: "Pertanyaan atau tujuan bisnis",
    });
    const submitBtn = screen.getByRole("button", { name: "Simpan draft ↑" });

    await user.type(textarea, "Satu pesan");
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });
});
