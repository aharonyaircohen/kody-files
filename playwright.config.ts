import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.BASE_URL ?? "http://localhost:3335",
  },
  reporter: "list",
});
