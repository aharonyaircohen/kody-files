import { expect, test } from "@playwright/test";

test("opens a real GitHub repository and previews a file", async ({ page }) => {
  const token = process.env.GITHUB_TOKEN;
  test.skip(!token, "GITHUB_TOKEN is required for the live GitHub journey");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => errors.push(`${request.method()} ${request.url()}`));

  await page.goto("/files");
  await page.getByLabel("GitHub token").fill(token!);
  await page.getByLabel("Owner").fill("aharonyaircohen");
  await page.getByLabel("Repository").fill("kody-chat");
  await page.getByRole("button", { name: "Open repository" }).click();
  await expect(page.getByText("aharonyaircohen/kody-chat")).toBeVisible();
  await expect(page.getByText("README.md").first()).toBeVisible({ timeout: 20_000 });
  await page.getByText("README.md").first().click();
  await expect(page.getByText("Kody", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Disconnect" }).click();
  await expect.poll(() => page.getByLabel("GitHub token").inputValue().then((value) => value.length)).toBe(0);
  expect(errors).toEqual([]);
});
