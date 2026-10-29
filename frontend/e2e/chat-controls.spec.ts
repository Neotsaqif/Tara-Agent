import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [375, 768, 1024, 1440]) {
  test(`chat disclosure spacing and sidebar focus remain usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/health", (route) =>
      route.fulfill({ json: { status: "ok", environment: "test" } }),
    );
    await page.goto("/#chat");
    await page.getByRole("button", { name: "Demo Figma", exact: true }).click();

    const rationale = page
      .getByRole("button", { name: "Lihat alasan", exact: true })
      .first();
    await expect(rationale).toHaveCSS("gap", "8px");
    expect((await rationale.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(rationale.locator("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await expect(rationale).toHaveAccessibleName("Lihat alasan");

    const summary = page.locator(".selection-bubble summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".selection-bubble details")).not.toHaveAttribute(
      "open",
    );
    await page.keyboard.press("Space");
    await expect(page.locator(".selection-bubble details")).toHaveAttribute(
      "open",
      "",
    );

    if (width < 1024) {
      await page
        .getByRole("button", { name: "Buka navigasi", exact: true })
        .click();
    }
    const search = page.getByRole("searchbox", { name: "Cari chat" });
    await search.focus();
    await expect(search).toBeFocused();
    await expect(search).toHaveAttribute("placeholder", "Cari chat");
    const geometry = await search.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const host = element.closest(".chat-history-prototype")!;
      const bounds = host.getBoundingClientRect();
      const style = getComputedStyle(element);
      const focusSpace =
        parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      return {
        leftSpace: rect.left - bounds.left,
        rightSpace: bounds.left + host.clientWidth - rect.right,
        focusSpace,
        paddingLeft: parseFloat(style.paddingLeft),
      };
    });
    expect(geometry.leftSpace).toBeGreaterThanOrEqual(geometry.focusSpace);
    expect(geometry.rightSpace).toBeGreaterThanOrEqual(geometry.focusSpace);
    expect(geometry.paddingLeft).toBe(36);

    const history = page.locator(".conversation-history");
    const historySummary = history.locator("summary");
    await expect(historySummary).toHaveCSS("gap", "8px");
    await historySummary.focus();
    await page.keyboard.press("Enter");
    await expect(history).not.toHaveAttribute("open");
    await page.keyboard.press("Enter");
    await expect(history).toHaveAttribute("open", "");
    await expect(search).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
