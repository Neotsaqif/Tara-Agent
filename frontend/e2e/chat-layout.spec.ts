import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [375, 768, 1024, 1440]) {
  test(`user messages align right and AI responses align left at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/health", (route) =>
      route.fulfill({ json: { status: "ok", environment: "test" } }),
    );
    await page.goto("/#chat");

    const workspace = page.locator(".chat-workspace");
    const input = page.getByRole("textbox", {
      name: "Pertanyaan atau tujuan bisnis",
    });
    const submit = page.getByRole("button", { name: "Simpan draft ↑" });
    const userBubble = page.getByRole("article", {
      name: "Draft pesan pengguna",
    });

    await input.fill("Halo");
    await submit.click();
    await expect(userBubble).toHaveText("Draft lokal: Halo");
    await expect(userBubble).toHaveCSS("background-color", "rgb(23, 37, 84)");

    async function expectRightAligned() {
      const parent = await workspace.boundingBox();
      const bubble = await userBubble.boundingBox();
      expect(parent).not.toBeNull();
      expect(bubble).not.toBeNull();
      expect(
        Math.abs(bubble!.x + bubble!.width - parent!.x - parent!.width),
      ).toBeLessThanOrEqual(1);
      expect(bubble!.width).toBeLessThanOrEqual(parent!.width * 0.9 + 1);
      expect(bubble!.x).toBeGreaterThan(parent!.x);
    }

    await expectRightAligned();
    const shortWidth = (await userBubble.boundingBox())!.width;

    await input.fill(`Pertanyaan panjang\n${"penjualan".repeat(150)}`);
    await submit.click();
    await expectRightAligned();
    expect((await userBubble.boundingBox())!.width).toBeGreaterThan(shortWidth);
    expect(
      await userBubble.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);

    // AI content is only available in the explicitly selected demo mode.
    await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
    const aiBubble = page.getByRole("article", { name: "Tanggapan AI" });
    await expect(aiBubble).toBeVisible();
    const parent = (await workspace.boundingBox())!;
    const ai = (await aiBubble.boundingBox())!;
    expect(Math.abs(ai.x - parent.x)).toBeLessThanOrEqual(1);
    expect(ai.width).toBeLessThanOrEqual(Math.min(704, parent.width) + 1);

    const fixtureUser = (await page
      .getByRole("article", {
        name: "Pesan pengguna",
        exact: true,
      })
      .boundingBox())!;
    expect(
      Math.abs(fixtureUser.x + fixtureUser.width - parent.x - parent.width),
    ).toBeLessThanOrEqual(1);

    await page
      .getByRole("button", { name: "Putar ulang respons demo" })
      .click();
    const loading = page.getByRole("status").filter({ hasText: "Command AI" });
    await expect(loading).toBeVisible();
    expect(
      Math.abs((await loading.boundingBox())!.x - parent.x),
    ).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Batalkan pratinjau" }).click();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
