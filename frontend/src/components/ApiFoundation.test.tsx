import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import DecisionSandbox, { HealthStatus } from "./ApiFoundation";

vi.mock("../api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("../api/client")>();
  return { ...original, api: { health: vi.fn(), decision: vi.fn() } };
});
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("HealthStatus", () => {
  it("reports the actual API response but does not claim integrations are ready", async () => {
    vi.mocked(api.health).mockResolvedValue({
      status: "ok",
      environment: "test",
    });
    render(<HealthStatus />);
    const region = screen.getByRole("region", { name: "Status API" });
    expect(within(region).getByRole("status")).toHaveTextContent(
      "Memeriksa health API…",
    );
    expect(
      within(region).getByRole("button", { name: "Periksa ulang API" }),
    ).toBeDisabled();
    expect(
      await within(region).findByText(
        "API merespons · status: ok · environment: test",
        { exact: true },
      ),
    ).toBeInTheDocument();
    expect(
      within(region).getByText(/Health bukan bukti database, LLM/),
    ).toBeInTheDocument();
    expect(
      within(region).getByRole("button", { name: "Periksa ulang API" }),
    ).toBeEnabled();
  });

  it("shows health errors without demo fallback and can retry successfully", async () => {
    const user = userEvent.setup();
    vi.mocked(api.health)
      .mockRejectedValueOnce(new Error("API offline"))
      .mockResolvedValueOnce({ status: "ok", environment: "local" });
    render(<HealthStatus />);
    expect(
      await screen.findByText("API offline", { exact: true }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/API merespons/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Periksa ulang API" }));
    expect(
      await screen.findByText(
        "API merespons · status: ok · environment: local",
        { exact: true },
      ),
    ).toBeInTheDocument();
    expect(api.health).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText("API offline", { exact: true }),
    ).not.toBeInTheDocument();
  });

  it("cancels an in-flight health check on unmount", () => {
    vi.mocked(api.health).mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<HealthStatus />);
    const signal = vi.mocked(api.health).mock.calls[0][0];
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});

describe("Decision sandbox", () => {
  it("requires acknowledgement and clearly labels a real response as stateless", async () => {
    const user = userEvent.setup();
    vi.mocked(api.decision).mockResolvedValue({
      state: "closed",
      decision: "reject",
      event_id: "test-event",
      revision_parameters: {},
    });
    render(<DecisionSandbox />);
    const submit = screen.getByRole("button", { name: "Uji transisi fondasi" });
    expect(submit).toBeDisabled();
    expect(api.decision).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("checkbox", {
        name: "Saya memahami ini hanya pengujian API fondasi, tanpa approval atau eksekusi bisnis.",
      }),
    );
    await user.click(submit);
    expect(api.decision).toHaveBeenCalledExactlyOnceWith({
      state: "pending_approval",
      decision: "reject",
      revision_parameters: {},
    });
    expect(
      await screen.findByText("Respons transisi diterima: closed", {
        exact: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tidak ada campaign dijalankan, approval disimpan/),
    ).toBeInTheDocument();
  });

  it("requires and trims the approval test label without presenting it as authentication", async () => {
    const user = userEvent.setup();
    vi.mocked(api.decision).mockResolvedValue({
      state: "executing",
      decision: "approve",
      event_id: "test-event",
      revision_parameters: {},
    });
    render(<DecisionSandbox />);
    await user.click(screen.getByRole("checkbox"));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Keputusan sandbox" }),
      "approve",
    );
    const submit = screen.getByRole("button", { name: "Uji transisi fondasi" });
    expect(submit).toBeDisabled();
    const approver = screen.getByRole("textbox", {
      name: "approved_by · label uji, bukan identitas login",
    });
    await user.type(approver, "   ");
    expect(submit).toBeDisabled();
    await user.clear(approver);
    await user.type(approver, "  tester  ");
    await user.click(submit);
    expect(api.decision).toHaveBeenCalledExactlyOnceWith({
      state: "pending_approval",
      decision: "approve",
      approved_by: "tester",
      revision_parameters: {},
    });
    expect(
      await screen.findByText("Respons transisi diterima: executing", {
        exact: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /approved_by hanyalah string; tidak mengautentikasi pengguna/,
      ),
    ).toBeInTheDocument();
  });

  it("requires string revision values and displays API errors without a demo response", async () => {
    const user = userEvent.setup();
    vi.mocked(api.decision).mockRejectedValue(
      new Error("Transisi tidak sah (409)."),
    );
    render(<DecisionSandbox />);
    await user.click(screen.getByRole("checkbox"));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Keputusan sandbox" }),
      "revise",
    );
    const submit = screen.getByRole("button", { name: "Uji transisi fondasi" });
    expect(submit).toBeDisabled();
    await user.type(
      screen.getByRole("textbox", { name: "Nilai parameter (string)" }),
      " 15 ",
    );
    await user.click(submit);
    expect(api.decision).toHaveBeenCalledExactlyOnceWith({
      state: "pending_approval",
      decision: "revise",
      revision_parameters: { max_discount: "15" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Transisi tidak sah (409). Tidak ada fallback demo.",
    );
    expect(
      screen.queryByText(/Respons transisi diterima/),
    ).not.toBeInTheDocument();
    expect(submit).toBeEnabled();
  });
});
