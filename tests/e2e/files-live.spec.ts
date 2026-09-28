import { expect, test } from "@playwright/test";

test("reads a real GitHub repository with the entered token", async ({ page }) => {
  const token = process.env.GITHUB_TOKEN;
  test.skip(!token, "GITHUB_TOKEN is required for the live journey");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => errors.push(`${request.method()} ${request.url()}`));

  await page.goto("/files");
  await page.getByLabel("GitHub token").fill(token!);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Signed in as aharonyaircohen")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Repository")).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Repository").selectOption("aharonyaircohen/kody-chat");
  await expect(page.getByText("README.md").first()).toBeVisible({ timeout: 20_000 });
  await page.getByText("README.md").first().click();
  await page.getByRole("button", { name: "View mode" }).click();
  await expect(page.locator(".prose h1")).toContainText("Kody");
  expect(errors).toEqual([]);
});
