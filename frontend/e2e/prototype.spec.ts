import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test.setTimeout(90_000);

const widths = [375, 768, 1024, 1440];
const tabs = [
  {
    name: "Produk",
    slug: "products",
    title: "Pahami kinerja di balik angka",
    table: "Kinerja produk",
    row: "Latte Es",
    metric: "Rp 286,4 jt",
  },
  {
    name: "Pelanggan",
    slug: "customers",
    title: "Analitik / Pelanggan",
    table: "Rincian pelanggan",
    row: "Pelanggan setia",
    metric: "3.248",
  },
  {
    name: "Outlet",
    slug: "outlets",
    title: "Analitik / Outlet",
    table: "Rincian outlet",
    row: "Pusat Kota",
    metric: "Rp 95,5 jt",
  },
  {
    name: "Margin",
    slug: "margin",
    title: "Analitik / Margin",
    table: "Rincian margin",
    row: "Kopi",
    metric: "Rp 178,7 jt",
  },
  {
    name: "Musiman",
    slug: "seasonal",
    title: "Analitik / Musiman",
    table: "Rincian musiman",
    row: "Sabtu malam",
    metric: "26 Sep",
  },
];

async function demo(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Demo Figma", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
}

async function navigate(page: Page, hash: string) {
  await page.evaluate((next) => {
    location.hash = next;
  }, hash);
  await expect(page).toHaveURL(
    new RegExp(`#${hash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
  );
}

async function accessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function closeDialog(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/health", (route) =>
    route.fulfill({ json: { status: "ok", environment: "test" } }),
  );
});

for (const width of widths) {
  test.describe(`${width}px Chromium prototype`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("all five analytics tabs, filters and exact CSV contents", async ({
      page,
    }) => {
      await demo(page, "analytics/products");
      for (const tab of tabs) {
        await page.getByRole("tab", { name: tab.name, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`#analytics/${tab.slug}$`));
        await expect(
          page.getByRole("tab", { name: tab.name, exact: true }),
        ).toHaveAttribute("aria-selected", "true");
        await expect(
          page.getByRole("heading", { name: tab.title, exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("tabpanel")).toHaveAccessibleName(tab.name);
        await expect(
          page.getByText(tab.metric, { exact: true }).first(),
        ).toBeVisible();
        await expect(
          page
            .getByRole("region", { name: tab.table, exact: true })
            .getByRole("rowheader", { name: tab.row, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("status").filter({ hasText: "Memperbarui analitik" }),
        ).toHaveCount(0);
        await accessible(page);
        const tableRows = await page
          .getByRole("region", { name: tab.table, exact: true })
          .getByRole("row")
          .evaluateAll((rows) =>
            rows.map((row) =>
              Array.from(
                row.querySelectorAll("th, td"),
                (cell) => cell.textContent ?? "",
              ),
            ),
          );
        await page
          .getByRole("button", { name: "Ekspor laporan", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Laporan siap", exact: true }),
        ).toBeVisible();
        await accessible(page);
        const downloaded = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Unduh CSV demo", exact: true })
          .click();
        const download = await downloaded;
        expect(download.suggestedFilename()).toBe(
          `demo-analitik-${tab.name.toLowerCase()}-2026-09-13.csv`,
        );
        const path = await download.path();
        expect(path).not.toBeNull();
        const csv = await readFile(path!, "utf8");
        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(csv).toContain('"DEMO / SIMULASI — bukan data bisnis aktual"');
        expect(csv).toContain(
          `"${tab.table}","1–13 Sep 2026","Semua Outlet","Semua kategori"`,
        );
        expect(csv).toContain(`"${tab.row}"`);
        const quoteCell = (value: string) =>
          `"${value.replace(/^(\s*)([=+@−-])/, "$1'$2").replace(/"/g, '""')}"`;
        expect(csv.split("\r\n").slice(2)).toEqual(
          tableRows.map((row) => row.map(quoteCell).join(",")),
        );
        expect(csv).toContain("\r\n");
        expect(csv.split("\r\n").length).toBeGreaterThanOrEqual(6);
        // Values beginning with formula operators must remain inert spreadsheet text.
        expect(csv).not.toMatch(/(?:^|,)"[=+@−-]/m);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(
          page.getByText("CSV demo diunduh ke perangkat ini.", {
            exact: false,
          }),
        ).toBeVisible();
      }
      await page.getByRole("tab", { name: "Produk", exact: true }).click();
      await page
        .getByRole("button", {
          name: "Bandingkan periode sebelumnya",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Bandingkan periode sebelumnya",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .getByLabel("Kategori analitik", { exact: true })
        .selectOption("Kopi");
      await expect(
        page.getByRole("heading", {
          name: "Tidak ada data demo untuk filter ini",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Ekspor laporan", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByRole("region", { name: "Kinerja produk", exact: true }),
      ).toHaveCount(0);
      await page
        .getByLabel("Kategori analitik", { exact: true })
        .selectOption("Semua kategori");
      await expect(
        page.getByRole("region", { name: "Kinerja produk", exact: true }),
      ).toBeVisible();
    });

    test("analytics keyboard navigation preserves focus across route changes", async ({
      page,
    }) => {
      await demo(page, "analytics/seasonal");
      const seasonal = page.getByRole("tab", { name: "Musiman", exact: true });
      const products = page.getByRole("tab", { name: "Produk", exact: true });
      await seasonal.focus();
      await page.keyboard.press("ArrowRight");
      await expect(products).toHaveAttribute("aria-selected", "true");
      await expect(products).toBeFocused();
      await page.keyboard.press("End");
      await expect(seasonal).toBeFocused();
      await page.keyboard.press("Home");
      await expect(products).toBeFocused();
    });

    test("settings simulation saves locally, connects accounting and resets on mode change", async ({
      page,
    }) => {
      const mutations: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/") && request.method() !== "GET")
          mutations.push(`${request.method()} ${request.url()}`);
      });
      await demo(page, "settings");
      await page
        .getByLabel("Nama bisnis", { exact: true })
        .fill("Prototype Café");
      await page
        .getByLabel("Deviasi pendapatan (±%)", { exact: true })
        .fill("12.5");
      await page.getByRole("radio", { name: /Konservatif/ }).check();
      await page
        .getByRole("button", { name: "Pratinjau Perubahan", exact: true })
        .click();
      const preview = page.getByRole("dialog", {
        name: "Pratinjau perubahan lokal",
        exact: true,
      });
      await expect(
        preview.getByText("Prototype Café", { exact: true }),
      ).toBeVisible();
      await expect(preview.getByText("±12.5%", { exact: true })).toBeVisible();
      await expect(
        preview.getByText("Konservatif", { exact: true }),
      ).toBeVisible();
      await accessible(page);
      await page
        .getByRole("button", { name: "Simulasikan penyimpanan", exact: true })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "Menyimpan perubahan" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Perubahan berhasil disimpan" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Tutup pemberitahuan", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Simulasikan koneksi", exact: true })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "Menghubungkan akuntansi" }),
      ).toBeVisible();
      await expect(
        page.getByRole("status").filter({ hasText: "Akuntansi terhubung" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Terhubung · simulasi", exact: true }),
      ).toBeDisabled();
      await page
        .getByRole("button", {
          name: "Tutup pemberitahuan koneksi",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Tentang undangan", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Undang anggota tim", exact: true }),
      ).toBeVisible();
      await accessible(page);
      await closeDialog(page);
      await page
        .getByRole("button", { name: "Detail koneksi", exact: true })
        .first()
        .click();
      await expect(
        page.getByRole("dialog", {
          name: "Fitur belum terhubung",
          exact: true,
        }),
      ).toBeVisible();
      await accessible(page);
      await closeDialog(page);
      await page
        .getByRole("button", { name: "API nyata", exact: true })
        .click();
      await expect(page.getByLabel("Nama bisnis", { exact: true })).toHaveValue(
        "",
      );
      await expect(
        page.getByRole("button", { name: "Simulasikan koneksi", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Demo Figma", exact: true })
        .click();
      await expect(page.getByLabel("Nama bisnis", { exact: true })).toHaveValue(
        "Command Demo Café",
      );
      await expect(
        page.getByRole("button", { name: "Simulasikan koneksi", exact: true }),
      ).toBeEnabled();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: /berhasil disimpan|Akuntansi terhubung/ }),
      ).toHaveCount(0);
      expect(mutations).toEqual([]);
    });

    test("open dialogs remain accessible and links reach their destination", async ({
      page,
    }) => {
      await demo(page, "overview");
      await page
        .getByRole("button", { name: "Notifikasi", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", {
          name: "1 promo perlu perhatian",
          exact: true,
        }),
      ).toBeVisible();
      await accessible(page);
      await page
        .getByRole("button", { name: "Tinjau promo", exact: true })
        .click();
      await expect(page).toHaveURL(/#monitoring\/weekend$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Hentikan Promo", exact: true })
        .first()
        .click();
      await accessible(page);
      await closeDialog(page);
      await navigate(page, "chat");
      await page
        .getByRole("button", { name: "Lihat alasan", exact: true })
        .first()
        .click();
      await accessible(page);
      await closeDialog(page);
      await page
        .getByRole("button", { name: "＋ Tambah konteks", exact: true })
        .click();
      await accessible(page);
      await closeDialog(page);
      await navigate(page, "chat/simulation/A");
      await page
        .getByRole("button", {
          name: "Lihat alasan dan data historis →",
          exact: true,
        })
        .click();
      await accessible(page);
      await closeDialog(page);
      await page
        .getByRole("button", { name: "Simulasikan penjadwalan", exact: true })
        .click();
      await accessible(page);
      await closeDialog(page);
      await navigate(page, "analytics/products");
      await page.getByRole("button", { name: /^Americano 72%/ }).click();
      await accessible(page);
      await closeDialog(page);
      await navigate(page, "memory");
      await page
        .getByRole("button", {
          name: /Paket sore lebih efektif dari diskon satuan/,
        })
        .click();
      await accessible(page);
      await page
        .getByRole("link", { name: "Diskusikan dengan AI", exact: true })
        .click();
      await expect(page).toHaveURL(/#chat\?context=memory$/);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name: "Mitra bisnis AI Anda",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("navigation drawer traps focus, makes background inert and restores focus", async ({
      page,
    }) => {
      if (width >= 1024) {
        await demo(page, "overview");
        await expect(
          page.getByRole("button", { name: "Buka navigasi", exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("complementary", {
            name: "Navigasi ruang kerja",
            exact: true,
          }),
        ).toBeVisible();
        return;
      }
      await demo(page, "overview");
      const trigger = page.getByRole("button", {
        name: "Buka navigasi",
        exact: true,
      });
      const sidebar = page.getByRole("dialog", {
        name: "Navigasi ruang kerja",
        exact: true,
      });
      await trigger.click();
      await expect(page.locator(".main-shell")).toHaveAttribute("inert", "");
      await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
      await expect(
        sidebar.getByRole("button", {
          name: "Tutup panel navigasi",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(
        sidebar.getByRole("link", { name: "Pengaturan", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        sidebar.getByRole("button", {
          name: "Tutup panel navigasi",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(page.locator(".main-shell")).not.toHaveAttribute("inert");
      await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
      await trigger.click();
      await sidebar
        .getByRole("link", { name: "Analitik", exact: true })
        .click();
      await expect(page).toHaveURL(/#analytics$/);
      await expect(page.locator("main")).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator(".main-shell")).not.toHaveAttribute("inert");
      await expect(
        page.getByRole("heading", {
          name: "Pahami kinerja di balik angka",
          exact: true,
        }),
      ).toBeVisible();
    });
  });
}

test("deep links, browser history and refresh keep the route but never persist demo mode", async ({
  page,
}) => {
  await demo(page, "chat?context=products&option=B");
  await expect(
    page
      .getByRole("region", { name: "Rekomendasi B", exact: true })
      .getByRole("button", { name: "Dipilih ✓", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Simulasikan B", exact: true })
    .click();
  await expect(page).toHaveURL(/#chat\/simulation\/B\?context=products$/);
  await expect(
    page.getByRole("heading", {
      name: "Simulasikan sebelum menyetujui",
      exact: true,
    }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#chat\?context=products&option=B$/);
  await page.goForward();
  await expect(
    page.getByRole("heading", {
      name: "Simulasikan sebelum menyetujui",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "API nyata", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Simulasikan penjadwalan", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Simulasikan sebelum menyetujui",
      exact: true,
    }),
  ).toBeVisible();
  for (const tab of tabs) {
    await navigate(page, `analytics/${tab.slug}`);
    await expect(
      page.getByRole("tab", { name: tab.name, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Data analitik belum tersedia",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
    await expect(
      page.getByRole("region", { name: tab.table, exact: true }),
    ).toBeVisible();
  }
});

test("invalid routes show a recovery link without falling back to business fixtures", async ({
  page,
}) => {
  await demo(page, "overview");
  for (const hash of [
    "unknown",
    "overview/extra",
    "chat/simulation/Z",
    "chat?context=unknown",
    "chat?option=Z",
    "monitoring/missing",
    "analytics/missing",
    "memory/extra",
    "settings/extra",
  ]) {
    await navigate(page, hash);
    await expect(
      page.getByRole("heading", {
        name: "Halaman tidak ditemukan",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Simulasikan sebelum menyetujui",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
    await page
      .getByRole("link", { name: "Kembali ke Ringkasan", exact: true })
      .click();
    await expect(page).toHaveURL(/#overview$/);
  }
});

test("header unsupported scope hides page actions and mode switching clears it", async ({
  page,
}) => {
  await demo(page, "analytics/products");
  await page
    .getByLabel("Outlet ruang kerja", { exact: true })
    .selectOption("Kampus");
  await expect(
    page.getByRole("heading", {
      name: "Fixture scope belum tersedia",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ekspor laporan", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "API nyata", exact: true }).click();
  await expect(
    page.getByLabel("Outlet ruang kerja", { exact: true }),
  ).toHaveValue("Semua Outlet");
  await expect(
    page.getByRole("heading", {
      name: "Data analitik belum tersedia",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await page
    .getByLabel("Tanggal ruang kerja", { exact: true })
    .selectOption("12 Sep 2026");
  await expect(
    page.getByRole("heading", {
      name: "Fixture scope belum tersedia",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Tanggal ruang kerja", { exact: true })
    .selectOption("13 Sep 2026");
  await expect(
    page.getByRole("region", { name: "Kinerja produk", exact: true }),
  ).toBeVisible();
});

test("pending demo timers are cleaned up on mode and route changes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await demo(page, "chat");
  await page.clock.install();
  await page
    .getByRole("button", { name: "Putar ulang respons demo", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Command AI");
  await page.getByRole("button", { name: "API nyata", exact: true }).click();
  await page.clock.fastForward(1200);
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await navigate(page, "analytics/products");
  await page
    .getByLabel("Kategori analitik", { exact: true })
    .selectOption("Kopi");
  await expect(
    page.getByRole("status").filter({ hasText: "Memperbarui analitik" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "API nyata", exact: true }).click();
  await page.clock.fastForward(1200);
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Memperbarui analitik" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Kategori analitik", { exact: true }),
  ).toHaveValue("Semua kategori");
  await navigate(page, "chat/simulation/A");
  await page
    .getByRole("button", { name: "Simulasikan penjadwalan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Konfirmasi simulasi", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Menjadwalkan promo demo…", exact: true }),
  ).toBeVisible();
  await closeDialog(page);
  await navigate(page, "settings");
  await page
    .getByRole("button", { name: "Simulasikan koneksi", exact: true })
    .click();
  await page.getByRole("button", { name: "API nyata", exact: true }).click();
  await page.clock.fastForward(1500);
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Simulasikan koneksi", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("status").filter({ hasText: "Akuntansi terhubung" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pratinjau Perubahan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulasikan penyimpanan", exact: true })
    .click();
  await navigate(page, "memory");
  await page.clock.fastForward(1500);
  await navigate(page, "settings");
  await expect(
    page.getByRole("status").filter({ hasText: "Perubahan berhasil disimpan" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

// Windows Chromium baseline inspected by the implementation agent.
// This detects regressions, not pixel-perfect equivalence with Figma.
test("representative overview visual regression", async ({ page }) => {
  test.skip(
    process.platform !== "win32",
    "Baseline captured on Windows Chromium.",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await demo(page, "overview");
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("overview-demo-1440.png", {
    animations: "disabled",
    fullPage: true,
  });
});
