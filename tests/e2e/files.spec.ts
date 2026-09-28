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
  await expect(page).toHaveURL("http://localhost:3335/");
  expect(await page.locator("html").getAttribute("data-theme")).toBe("dark");
  await page.getByRole("button", { name: "Appearance and account" }).click();
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("github-files-theme"))).toBe("light");
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  await page.getByLabel("GitHub token").fill("test-token");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("github-files-token"))).toBe("test-token");
  const savedOrigin = (await context.storageState()).origins.find((entry) => entry.origin === "http://localhost:3335");
  expect(savedOrigin?.localStorage).toContainEqual({ name: "github-files-token", value: "test-token" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  await page.getByLabel("Repository").selectOption("octocat/hello-world");
  await expect(page).toHaveURL("http://localhost:3335/");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Files", exact: true })).toBeVisible();
  await expect(page.getByText("GitHub Files", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("banner").getByLabel("Repository")).toBeVisible();
  await page.getByRole("button", { name: "Appearance and account" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Appearance and account" }).click();
  await page.getByRole("menuitemradio", { name: "System" }).click();
  expect(await page.evaluate(() => localStorage.getItem("github-files-theme"))).toBeNull();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 320, height: 844 });
  const lastHeaderAction = await page.getByRole("button", { name: "More file actions" }).boundingBox();
  expect((lastHeaderAction?.x ?? 320) + (lastHeaderAction?.width ?? 0)).toBeLessThanOrEqual(320);
  await expect(page.getByRole("banner").getByLabel("Repository")).toBeVisible();
  await expect(page.getByRole("button", { name: "Appearance and account" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("banner").getByLabel("Repository")).toBeVisible();
  await expect(page.getByRole("button", { name: "Appearance and account" })).toBeVisible();
  await page.getByText("README.md").first().click();
  await expect(page).toHaveURL("http://localhost:3335/?path=README.md");
  await expect(page.getByRole("button", { name: "Show file panel" })).toBeVisible();
  const previewWidth = await page.getByRole("button", { name: "Show file panel" }).evaluate((element) => element.closest(".flex-1")?.getBoundingClientRect().width ?? 0);
  expect(previewWidth).toBeGreaterThan(300);
  await page.getByRole("button", { name: "Show file panel" }).click();
  await expect(page.getByText("README.md").first()).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByText("README.md").first()).toBeVisible();
  await page.getByText("README.md").first().click();
  await expect(page).toHaveURL("http://localhost:3335/?path=README.md");
  await page.getByRole("button", { name: "View mode" }).click();
  await expect(page.locator(".prose h1")).toHaveText("Hello");
  await expect(page.locator(".prose strong")).toHaveText("formatted");
  const headingSize = await page.locator(".prose h1").evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(headingSize)).toBeGreaterThan(16);
  await page.goBack();
  await expect(page).toHaveURL("http://localhost:3335/");
  await expect(page.locator(".prose h1")).toHaveCount(0);
  await page.getByLabel("Repository").selectOption("octocat/second");
  await expect(page).toHaveURL("http://localhost:3335/");
  await expect(page.getByText("SECOND.md").first()).toBeVisible();
  await expect(page.getByText("README.md")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("github-files-repository"))).toBe("octocat/second");
  await page.reload();
  await expect(page.getByLabel("Repository")).toHaveValue("octocat/second");
  await expect(page.getByText("SECOND.md").first()).toBeVisible();
  await page.getByRole("button", { name: "Appearance and account" }).click();
  await page.getByRole("menuitem", { name: "Forget token" }).click();
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("github-files-token"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("github-files-repository"))).toBeNull();
  expect(errors).toEqual([]);
});
