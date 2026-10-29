import { expect, test } from "@playwright/test";

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
