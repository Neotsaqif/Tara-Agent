import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:5192", trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- --port 5192 --strictPort", url: "http://127.0.0.1:5192", reuseExistingServer: true },
  reporter: [["list"]],
});
