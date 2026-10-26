import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.setTimeout(90_000);

const routes = [
  "overview",
  "chat",
  "monitoring",
  "monitoring/weekend",
  "analytics",
  "memory",
  "settings",
];
for (const width of [375, 768, 1024, 1440]) {
  test(`responsive pages and assets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/health", (route) =>
      route.fulfill({ json: { status: "ok", environment: "test" } }),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/#overview");
    await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
    for (const route of routes) {
      await page.evaluate((hash) => {
        location.hash = hash;
      }, route);
      await expect(page).toHaveURL(new RegExp(`#${route}$`));
      await expect(
        page.getByRole("button", { name: "Demo Figma", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect
        .poll(() =>
          page
            .locator("img")
            .evaluateAll((images) =>
              images
                .filter((image) => !image.complete || !image.naturalWidth)
                .map((image) => image.src),
            ),
        )
        .toEqual([]);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.map((item) => ({
          id: item.id,
          targets: item.nodes.map((node) => node.target),
        })),
        `Accessibility violations on #${route} at ${width}px`,
      ).toEqual([]);
    }
    await page.evaluate(() => {
      location.hash = "chat";
    });
    await page
      .getByRole("button", { name: "Simulasikan", exact: true })
      .first()
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("supported simulation fixture schedules a demo; changed parameters invalidate it", async ({
  page,
}) => {
  await page.goto("/#chat");
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await page
    .getByRole("button", { name: "Simulasikan", exact: true })
    .first()
    .click();
  await expect(page.getByText("Rp 27,6 jt", { exact: true })).toBeVisible();
  const approval = page.getByRole("button", {
    name: "Setujui Promo",
    exact: true,
  });
  await page
    .getByLabel("Penawaran", { exact: true })
    .selectOption("Kopi + pastri · Diskon 10%");
  await expect(page.getByText("Rp 27,6 jt", { exact: true })).toBeVisible();
  await page
    .getByLabel("Outlet sasaran", { exact: true })
    .selectOption("Kampus");
  await expect(page.getByText("Rp 27,6 jt", { exact: true })).toHaveCount(0);
  await expect(approval).toBeDisabled();
  await page
    .getByLabel("Outlet sasaran", { exact: true })
    .selectOption("Semua 3 outlet");
  await page
    .getByLabel("Penawaran", { exact: true })
    .selectOption("Kopi + pastri · Diskon 15%");
  await expect(approval).toBeEnabled();
  await approval.click();
  await expect(
    page.getByRole("dialog", { name: "Jadwalkan promo ini?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Konfirmasi Promo Demo", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(approval).toBeFocused();
  await approval.click();
  await page
    .getByRole("button", { name: "Konfirmasi Promo Demo", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Menjadwalkan promo demo…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Promo demo berhasil dijadwalkan" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Lihat Pemantauan", exact: true })
    .click();
  await expect(page).toHaveURL(/#monitoring\/afternoon$/);
  await expect(
    page.getByRole("button", { name: "Batalkan Promo", exact: true }).first(),
  ).toBeVisible();
});

test("live API failure stays live and allows retry", async ({ page }) => {
  await page.route("**/api/v1/health", (route) => route.abort());
  await page.goto("/#overview");
  await expect(
    page.getByText("API tidak dapat dihubungi.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "API nyata", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Rp 24,8 jt", { exact: true })).toHaveCount(0);
  await page.unroute("**/api/v1/health");
  await page.route("**/api/v1/health", (route) =>
    route.fulfill({ json: { status: "ok", environment: "test" } }),
  );
  await page.getByRole("button", { name: "Periksa ulang API" }).click();
  await expect(
    page.getByText("API merespons · status: ok · environment: test", {
      exact: true,
    }),
  ).toBeVisible();
});

test("real local API health and three stateless transitions", async ({
  page,
}) => {
  await page.goto("/#settings");
  await expect(
    page.getByText("API merespons · status: ok", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "Saya memahami ini hanya pengujian",
      exact: false,
    })
    .check();
  await page.getByRole("button", { name: "Uji transisi fondasi" }).click();
  await expect(
    page.getByText("Respons transisi diterima: reexecuting", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Keputusan sandbox", { exact: true })
    .selectOption("revise");
  await page.getByLabel("Nilai parameter (string)", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Uji transisi fondasi" }).click();
  await expect(
    page.getByText("Respons transisi diterima: revision_requested", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Keputusan sandbox", { exact: true })
    .selectOption("approve");
  await page
    .getByLabel("approved_by · label uji, bukan identitas login", {
      exact: true,
    })
    .fill("local-contract-test");
  await page.getByRole("button", { name: "Uji transisi fondasi" }).click();
  await expect(
    page.getByText("Respons transisi diterima: executing", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Tidak ada campaign dijalankan, approval disimpan, atau revisi strategi dihitung.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("mobile navigation, notification dialog and monitoring filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/#overview");
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await page
    .getByRole("button", { name: "Buka navigasi", exact: true })
    .click();
  await page.getByRole("link", { name: "Pemantauan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pantau setiap promo." }),
  ).toBeVisible();
  await page.getByLabel("Cari promo", { exact: true }).fill("tidak-ada");
  await expect(
    page.getByRole("heading", { name: "Tidak ada promo yang cocok" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Notifikasi", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Notifikasi", exact: true }),
  ).toBeFocused();
});
