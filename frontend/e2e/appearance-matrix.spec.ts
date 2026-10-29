import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

async function change(page: Page, theme: string, sidebarPosition: string) {
  await page.evaluate(
    ({ theme, sidebarPosition }) => {
      const newValue = JSON.stringify({ theme, sidebarPosition });
      localStorage.setItem("tara.appearance.v1", newValue);
      window.dispatchEvent(
        new StorageEvent("storage", { key: "tara.appearance.v1", newValue }),
      );
    },
    { theme, sidebarPosition },
  );
}
for (const width of [375, 768, 1024, 1440]) {
  for (const side of ["left", "right"]) {
    for (const theme of ["light", "dark", "gray", "system"]) {
      test(`${width}px ${side} ${theme}: settings, navigation, contrast and overflow`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 700 });
        await page.emulateMedia({
          colorScheme: "dark",
          reducedMotion: "reduce",
        });
        await page.route("**/api/v1/health", (route) =>
          route.fulfill({ json: { status: "ok", environment: "test" } }),
        );
        await page.goto("/#settings");
        await change(page, theme, side);
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          theme === "system" ? "dark" : theme,
        );
        const business = page.getByRole("textbox", { name: "Nama bisnis" });
        await business.fill("Draft tidak hilang");
        await page.getByRole("radio", { name: "Kanan", exact: true }).check();
        await page.getByRole("radio", { name: "Kiri", exact: true }).check();
        await page
          .getByRole("radio", {
            name: side === "left" ? "Kiri" : "Kanan",
            exact: true,
          })
          .check();
        await expect(business).toHaveValue("Draft tidak hilang");
        await expect(page).toHaveURL(/#settings$/);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        if (width < 1024) {
          await page
            .getByRole("button", { name: "Buka navigasi", exact: true })
            .click();
          const drawer = page.getByRole("dialog", {
            name: "Navigasi ruang kerja",
          });
          expect(Math.round((await drawer.boundingBox())!.x)).toBe(
            side === "left" ? 0 : width - 232,
          );
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
          );
          // A preference change while open keeps one modal and cleans up normally.
          await change(page, theme, side === "left" ? "right" : "left");
          await expect(page.locator(".sidebar")).toHaveCount(1);
          await expect(page.locator(".nav-backdrop")).toHaveCount(1);
          await page.keyboard.press("Escape");
          await expect(page.locator("body")).not.toHaveCSS(
            "overflow",
            "hidden",
          );
          await change(page, theme, side);
        }
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute(
          "data-sidebar-position",
          side,
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          theme === "system" ? "dark" : theme,
        );
      });
    }
  }
}

for (const theme of ["light", "dark", "gray"]) {
  test(`all demo pages use accessible ${theme} surfaces`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/v1/health", (route) =>
      route.fulfill({ json: { status: "ok", environment: "test" } }),
    );
    await page.goto("/#overview");
    await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
    await change(page, theme, "right");
    for (const route of [
      "overview",
      "chat",
      "monitoring",
      "analytics",
      "memory",
      "settings",
      "chat/simulation/A",
    ]) {
      await page.evaluate((route) => {
        location.hash = route;
      }, route);
      await expect(page.locator("main")).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).analyze()).violations,
        `${theme} ${route}`,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}

test("system, explicit themes, corrupt/blocked storage, filters and scoped reset", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/#settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("radio", { name: /^Gelap/ }).check();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.evaluate(() => localStorage.setItem("unrelated", "keep"));
  await page.getByRole("button", { name: "Reset tampilan" }).click();
  expect(await page.evaluate(() => localStorage.getItem("unrelated"))).toBe(
    "keep",
  );
  await page.evaluate(() =>
    localStorage.setItem("tara.appearance.v1", "corrupt"),
  );
  await page.reload();
  await expect(page.getByRole("radio", { name: /^Sistem/ })).toBeChecked();
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.reload();
  await page.getByRole("radio", { name: /^Abu-abu/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "gray");
  await page.getByRole("radio", { name: "Kanan", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute(
    "data-sidebar-position",
    "right",
  );
});

test("short drawers retain access to profile, settings and chat search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 420 });
  await page.goto("/#chat");
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  for (const height of [420, 600, 700, 900]) {
    await page.setViewportSize({ width: 375, height });
    for (const side of ["left", "right"]) {
      await change(page, "dark", side);
      await page
        .getByRole("button", { name: "Buka navigasi", exact: true })
        .click();
      const settings = page.getByRole("link", {
        name: "Pengaturan",
        exact: true,
      });
      await settings.scrollIntoViewIfNeeded();
      await expect(settings).toBeInViewport();
      const search = page.getByRole("searchbox", { name: "Cari chat" });
      await search.focus();
      await expect(search).toBeFocused();
      await expect(search).toBeInViewport();
      expect((await search.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.keyboard.press("Escape");
    }
  }
});

test("appearance changes retain chat draft, search, disclosures and header filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#chat");
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  const draft = page.getByRole("textbox", {
    name: "Pertanyaan atau tujuan bisnis",
  });
  await draft.fill("Draft chat tetap ada");
  const search = page.getByRole("searchbox", { name: "Cari chat" });
  await search.fill("margin");
  await page
    .getByRole("button", { name: "Lihat alasan", exact: true })
    .first()
    .click();
  await change(page, "dark", "right");
  await expect(draft).toHaveValue("Draft chat tetap ada");
  await expect(search).toHaveValue("margin");
  await expect(
    page.getByRole("button", { name: "Tutup alasan", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(/#chat$/);
  const outlet = page.getByRole("combobox", { name: "Outlet ruang kerja" });
  await outlet.selectOption("Kampus");
  await change(page, "gray", "left");
  await expect(outlet).toHaveValue("Kampus");
});

test("capture representative themes and drawer sides", async ({ page }) => {
  await mkdir("../docs/screenshots/appearance", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/v1/health", (route) =>
    route.fulfill({ json: { status: "ok", environment: "test" } }),
  );
  await page.goto("/#overview");
  await page.getByRole("button", { name: "Demo Figma", exact: true }).click();
  for (const [theme, side] of [
    ["light", "left"],
    ["dark", "right"],
    ["gray", "right"],
  ]) {
    await change(page, theme, side);
    await page.screenshot({
      path: `../docs/screenshots/appearance/${theme}-${side}-1440.png`,
    });
  }
  await page.evaluate(() => {
    location.hash = "settings";
  });
  await page.getByRole("button", { name: "Tampilan", exact: true }).click();
  await page.screenshot({
    path: "../docs/screenshots/appearance/settings-gray-1440.png",
  });
  await page.setViewportSize({ width: 375, height: 700 });
  for (const side of ["left", "right"]) {
    await change(page, "dark", side);
    await page
      .getByRole("button", { name: "Buka navigasi", exact: true })
      .click();
    await page.screenshot({
      path: `../docs/screenshots/appearance/drawer-dark-${side}-375.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
  }
});
