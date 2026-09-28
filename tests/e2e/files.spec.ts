import { expect, test } from "@playwright/test";

test("accepts a persistent token, browses files, and forgets it", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.route("**/api/auth/token", (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    return route.fulfill({ json: { login: "octocat" } });
  });
  await page.route("**/api/repos", (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    return route.fulfill({ json: { repositories: [
      { owner: "octocat", repo: "hello-world", fullName: "octocat/hello-world", private: false },
      { owner: "octocat", repo: "second", fullName: "octocat/second", private: true },
    ] } });
  });
  await page.route("**/api/files", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    const request = route.request().postDataJSON();
    const fileName = request.repo === "second" ? "SECOND.md" : "README.md";
    const content = request.repo === "second" ? "# Second repository" : "# Hello\n\nA **formatted** paragraph.";
    const result = request.op === "listDir"
      ? [{ name: fileName, path: fileName, type: "file", size: content.length, sha: "abc" }]
      : request.op === "readFile"
        ? {
            path: fileName, sha: "abc", size: content.length, content,
            base64Content: Buffer.from(content).toString("base64"),
            isBinary: false, encoding: "base64",
          }
        : null;
    await route.fulfill({ json: { result } });
  });

  await page.goto("/files");
  expect(await page.locator("html").getAttribute("data-theme")).toBe("dark");
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  await page.getByLabel("GitHub token").fill("test-token");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("github-files-token"))).toBe("test-token");
  const savedOrigin = (await context.storageState()).origins.find((entry) => entry.origin === "http://localhost:3335");
  expect(savedOrigin?.localStorage).toContainEqual({ name: "github-files-token", value: "test-token" });
  await page.reload();
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  await page.getByLabel("Repository").selectOption("octocat/hello-world");
  await expect(page.getByText("README.md").first()).toBeVisible();
  await page.getByText("README.md").first().click();
  await page.getByRole("button", { name: "View mode" }).click();
  await expect(page.locator(".prose h1")).toHaveText("Hello");
  await expect(page.locator(".prose strong")).toHaveText("formatted");
  const headingSize = await page.locator(".prose h1").evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(headingSize)).toBeGreaterThan(16);
  await page.getByLabel("Repository").selectOption("octocat/second");
  await expect(page.getByText("SECOND.md").first()).toBeVisible();
  await expect(page.getByText("README.md")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("github-files-repository"))).toBe("octocat/second");
  await page.reload();
  await expect(page.getByLabel("Repository")).toHaveValue("octocat/second");
  await expect(page.getByText("SECOND.md").first()).toBeVisible();
  await page.getByRole("button", { name: "Forget token" }).click();
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("github-files-token"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("github-files-repository"))).toBeNull();
  expect(errors).toEqual([]);
});
