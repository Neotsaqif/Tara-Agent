import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AppearanceSettings from "../../src/components/AppearanceSettings";
import { readAppearance, resetAppearance } from "../../src/state/appearance";

afterEach(resetAppearance);
it("exposes labeled native radio groups, immediate updates and scoped reset", () => {
  render(<AppearanceSettings />);
  expect(
    screen.getByRole("group", { name: "Posisi Sidebar" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("radio", { name: "Kiri" }),
  ).toBeChecked();
  expect(screen.getByRole("radio", { name: /Sistem/ })).toBeChecked();
  fireEvent.click(screen.getByRole("radio", { name: "Kanan" }));
  for (const label of ["Terang", "Gelap", "Abu-abu", "Sistem"]) {
    const radio = screen.getByRole("radio", { name: new RegExp(label) });
    fireEvent.click(radio);
    expect(radio).toBeChecked();
  }
  expect(readAppearance().sidebarPosition).toBe("right");
  fireEvent.click(screen.getByRole("button", { name: "Reset tampilan" }));
  expect(
    screen.getByRole("radio", { name: "Kiri" }),
  ).toBeChecked();
  expect(screen.getByRole("radio", { name: /Sistem/ })).toBeChecked();
});
