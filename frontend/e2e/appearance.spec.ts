import { expect, test } from "@playwright/test";

for (const side of ["left", "right"] as const) {
  test(`mobile drawer ${side} closes, traps focus and unlocks background`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 600 });
    await page.addInitScript(
      (sidebarPosition) =>
        localStorage.setItem(
          "tara.appearance.v1",
          JSON.stringify({ sidebarPosition, theme: "light" }),
        ),
      side,
    );
    await page.goto("/#settings");
    const trigger = page.getByRole("button", {
      name: "Buka navigasi",
      exact: true,
    });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Navigasi ruang kerja" });
    await expect(drawer).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tutup panel navigasi" }),
    ).toBeFocused();
    await expect
      .poll(async () => Math.round((await drawer.boundingBox())!.x))
      .toBe(side === "left" ? 0 : 143);
    await expect(page.locator(".main-shell")).toHaveJSProperty("inert", true);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("link", { name: "Pengaturan", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Tutup panel navigasi" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.locator(".main-shell")).toHaveJSProperty("inert", false);
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await trigger.click();
    await page.getByRole("button", { name: "Tutup panel navigasi" }).click();
    await trigger.click();
    await page
      .getByRole("button", { name: "Tutup navigasi", exact: true })
      .first()
      .click({ position: { x: side === "left" ? 350 : 10, y: 590 } });
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("link", { name: "Analitik", exact: true }).click();
    await expect(page.locator(".nav-backdrop")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });
}

for (const side of ["left", "right"] as const) {
  test(`desktop sidebar ${side} preserves filters and route`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(
      (sidebarPosition) =>
        localStorage.setItem(
          "tara.appearance.v1",
          JSON.stringify({ sidebarPosition, theme: "light" }),
        ),
      side,
    );
    await page.goto("/#settings");
    const sidebar = await page.locator(".sidebar").boundingBox();
    const content = await page.locator(".main-shell").boundingBox();
    expect(sidebar!.x).toBe(side === "left" ? 0 : 1208);
    expect(content!.width).toBe(1208);
    expect(content!.x).toBe(side === "left" ? 232 : 0);
    await expect(page).toHaveURL(/#settings$/);
    await expect(
      page.getByRole("link", { name: "Pengaturan", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });
}
