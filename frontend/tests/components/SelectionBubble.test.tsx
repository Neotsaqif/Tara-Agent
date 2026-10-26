import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  SelectionBubble,
  type SelectionMessage,
} from "../../src/components/chat";

const mockOptions = [
  {
    id: "A" as const,
    title: "Paket Kopi Sore",
    description: "Paket kopi + pastri",
    impact: "+12–18% pendapatan",
    risk: "Risiko rendah · Margin 64%",
    margin: "64%",
    rationale: "Paket menaikkan nilai pesanan 14%",
    feasible: true,
  },
  {
    id: "B" as const,
    title: "Poin Loyalitas Ganda",
    description: "2× poin untuk pesanan sore",
    impact: "+8–12% pendapatan",
    risk: "Risiko rendah · Margin 66%",
    margin: "66%",
    rationale: "Mendorong kunjungan ulang",
    feasible: true,
  },
  {
    id: "C" as const,
    title: "Diskon Sore 20%",
    description: "Diskon terbatas",
    impact: "+18–24% pendapatan",
    risk: "Risiko sedang · Margin 55%",
    margin: "55%",
    rationale: "Margin di bawah target 60%",
    feasible: false,
    unfeasibleReason: "Margin 55% di bawah batas aman 60%",
  },
];

const mockMessage: SelectionMessage = {
  type: "selection",
  id: "sel-1",
  options: mockOptions,
  selectedOptionId: "A",
  rationaleTitle: "Mengapa A unggul",
  rationale: "Bukti historis mendukung paket kopi",
};

describe("SelectionBubble", () => {
  it("renders all options with titles, impact, and margins", () => {
    render(<SelectionBubble message={mockMessage} />);

    expect(screen.getByText("Paket Kopi Sore")).toBeInTheDocument();
    expect(screen.getByText("Poin Loyalitas Ganda")).toBeInTheDocument();
    expect(screen.getByText("Diskon Sore 20%")).toBeInTheDocument();

    expect(screen.getByText("+12–18% pendapatan")).toBeInTheDocument();
    expect(screen.getByText("Margin: 64%")).toBeInTheDocument();
    expect(screen.getByText("Margin: 55%")).toBeInTheDocument();
  });

  it("marks the selected option as Dipilih and disables its button", () => {
    render(<SelectionBubble message={mockMessage} />);

    const selectedBtn = screen.getByRole("button", {
      name: "Dipilih ✓",
    });
    expect(selectedBtn).toBeDisabled();
  });

  it("toggles rationale section with keyboard/click accessibility", async () => {
    const user = userEvent.setup();
    render(<SelectionBubble message={mockMessage} />);

    const toggleBtns = screen.getAllByRole("button", {
      name: "Lihat alasan ⌄",
    });
    const firstToggle = toggleBtns[0];

    expect(firstToggle).toHaveAttribute("aria-expanded", "false");
    expect(firstToggle).toHaveAttribute("aria-controls", "rationale-content-A");

    // Open via Enter key
    firstToggle.focus();
    await user.keyboard("{Enter}");

    expect(firstToggle).toHaveAttribute("aria-expanded", "true");
    expect(firstToggle).toHaveTextContent("Tutup alasan ⌃");
    const region = screen.getByRole("region", {
      name: "Alasan rekomendasi A",
    });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("id", "rationale-content-A");
    expect(
      screen.getByText("Paket menaikkan nilai pesanan 14%"),
    ).toBeInTheDocument();

    // Close via Space key
    await user.keyboard(" ");
    expect(firstToggle).toHaveAttribute("aria-expanded", "false");
    expect(region).not.toBeInTheDocument();
  });

  it("shows unfeasible reason when present in expanded rationale", async () => {
    const user = userEvent.setup();
    render(<SelectionBubble message={mockMessage} />);

    const toggleBtns = screen.getAllByRole("button", {
      name: "Lihat alasan ⌄",
    });
    // Click option C toggle
    await user.click(toggleBtns[2]);

    expect(
      screen.getByText(/Catatan kendala: Margin 55% di bawah batas aman 60%/),
    ).toBeInTheDocument();
  });

  it("calls onSelectOption and onSimulateOption callbacks", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const handleSimulate = vi.fn();

    render(
      <SelectionBubble
        message={mockMessage}
        onSelectOption={handleSelect}
        onSimulateOption={handleSimulate}
      />,
    );

    // Click Simulate on option B (first plain "Simulasikan" button since A is "Simulasikan A")
    const simB = screen.getAllByRole("button", {
      name: "Simulasikan",
    })[0];
    await user.click(simB);
    expect(handleSimulate).toHaveBeenCalledWith("B");

    // Click Setujui/Select on option B
    const selB = screen.getAllByRole("button", {
      name: "Setujui",
    })[0];
    await user.click(selB);
    expect(handleSelect).toHaveBeenCalledWith("B");
  });

  it("renders global rationale summary with details tag", () => {
    render(<SelectionBubble message={mockMessage} />);
    expect(screen.getByText("Mengapa A unggul ⌄")).toBeInTheDocument();
    expect(
      screen.getByText("Bukti historis mendukung paket kopi"),
    ).toBeInTheDocument();
  });
});
