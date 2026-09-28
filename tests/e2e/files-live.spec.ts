import { expect, test } from "@playwright/test";
import { sealSession } from "../../src/auth/session";

test("reads a real GitHub repository through the mounted server session", async ({ page, context }) => {
  const token = process.env.GITHUB_TOKEN;
  const secret = process.env.SESSION_SECRET;
  test.skip(!token || !secret, "GITHUB_TOKEN and SESSION_SECRET are required for the live journey");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => errors.push(`${request.method()} ${request.url()}`));
  await context.addCookies([{
    name: "ghf_session",
    value: sealSession({ token: token!, login: "aharonyaircohen", expiresAt: Date.now() + 60_000 }, secret!),
    url: "http://localhost:3335",
    httpOnly: true,
    sameSite: "Lax",
  }]);

  await page.goto("/files");
  await expect(page.getByText("Signed in as aharonyaircohen")).toBeVisible();
  await page.getByLabel("Owner").fill("aharonyaircohen");
  await page.getByLabel("Repository").fill("kody-chat");
  await page.getByRole("button", { name: "Open repository" }).click();
  await expect(page.getByText("README.md").first()).toBeVisible({ timeout: 20_000 });
  await page.getByText("README.md").first().click();
  await expect(page.getByText("Kody", { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
