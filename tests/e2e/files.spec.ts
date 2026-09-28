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
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("kody-files-theme"))).toBe("light");
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  await page.getByLabel("GitHub token").fill("test-token");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("kody-files-token"))).toBe("test-token");
  const savedOrigin = (await context.storageState()).origins.find((entry) => entry.origin === "http://localhost:3335");
  expect(savedOrigin?.localStorage).toContainEqual({ name: "kody-files-token", value: "test-token" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  await page.getByRole("button", { name: "Repository" }).click();
  await page.getByRole("searchbox", { name: "Search repositories" }).fill("missing");
  await expect(page.getByText("No repositories found")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search repositories" }).fill("HELLO");
  await expect(page.getByRole("option", { name: "hello-world" })).toBeVisible();
  await expect(page.getByRole("option", { name: "second" })).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Search repositories" }).press("Enter");
  await expect(page).toHaveURL("http://localhost:3335/");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Files", exact: true })).toBeVisible();
  await expect(page.getByText("Kody Files", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("banner").getByLabel("Repository")).toBeVisible();
  await page.getByRole("button", { name: "Repository" }).click();
  await page.getByRole("searchbox", { name: "Search repositories" }).press("Escape");
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("menuitemradio", { name: "System" }).click();
  expect(await page.evaluate(() => localStorage.getItem("kody-files-theme"))).toBeNull();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.getByRole("heading", { name: "Files", exact: true })).toBeVisible();
  const lastHeaderAction = await page.getByRole("button", { name: "More file actions" }).boundingBox();
  expect((lastHeaderAction?.x ?? 320) + (lastHeaderAction?.width ?? 0)).toBeLessThanOrEqual(320);
  await expect(page.getByRole("banner").getByLabel("Repository")).toBeVisible();
  await expect(page.getByRole("button", { name: "Appearance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Forget token" })).toBeVisible();
  await page.getByRole("button", { name: "Repository" }).click();
  const repositoryMenu = await page.getByRole("listbox", { name: "Repositories" }).boundingBox();
  expect(repositoryMenu?.x).toBeGreaterThanOrEqual(0);
  expect((repositoryMenu?.x ?? 320) + (repositoryMenu?.width ?? 0)).toBeLessThanOrEqual(320);
  await page.getByRole("searchbox", { name: "Search repositories" }).press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("banner").getByLabel("Repository")).toBeVisible();
  await expect(page.getByRole("button", { name: "Appearance" })).toBeVisible();
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
  await page.getByRole("button", { name: "Repository" }).click();
  await expect(page.getByRole("group", { name: "octocat repositories" })).toBeVisible();
  await expect(page.getByRole("option", { name: "hello-world" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("searchbox", { name: "Search repositories" }).fill("second");
  await page.getByRole("option", { name: "second" }).click();
  await expect(page).toHaveURL("http://localhost:3335/");
  await expect(page.getByText("SECOND.md").first()).toBeVisible();
  await expect(page.getByText("README.md")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("kody-files-repository"))).toBe("octocat/second");
  await page.reload();
  await expect(page.getByRole("button", { name: "Repository" })).toContainText("second");
  await expect(page.getByText("SECOND.md").first()).toBeVisible();
  await page.getByRole("button", { name: "Appearance" }).click();
  await expect(page.getByRole("menuitem", { name: "Forget token" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Forget token" }).click();
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("kody-files-token"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("kody-files-repository"))).toBeNull();
  expect(errors).toEqual([]);
});

test("migrates GitHub Files browser settings without losing the selected repository or drafts", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("github-files-token", "test-token");
    localStorage.setItem("github-files-repository", "octocat/hello-world");
    localStorage.setItem("github-files-theme", "light");
    localStorage.setItem("github-files:file-draft:octocat/hello-world/note.md", "saved draft");
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.route("**/api/auth/token", (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    return route.fulfill({ json: { login: "octocat" } });
  });
  await page.route("**/api/repos", (route) => route.fulfill({ json: { repositories: [
    { owner: "octocat", repo: "hello-world", fullName: "octocat/hello-world", private: false },
  ] } }));
  await page.route("**/api/files", (route) => route.fulfill({ json: { result: [] } }));

  await page.goto("/");
  await expect(page).toHaveTitle("Kody Files");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Repository" })).toContainText("hello-world");
  expect(await page.evaluate(() => ({
    token: localStorage.getItem("kody-files-token"),
    repository: localStorage.getItem("kody-files-repository"),
    theme: localStorage.getItem("kody-files-theme"),
    oldToken: localStorage.getItem("github-files-token"),
    oldRepository: localStorage.getItem("github-files-repository"),
    oldTheme: localStorage.getItem("github-files-theme"),
    draft: localStorage.getItem("github-files:file-draft:octocat/hello-world/note.md"),
  }))).toEqual({
    token: "test-token",
    repository: "octocat/hello-world",
    theme: "light",
    oldToken: null,
    oldRepository: null,
    oldTheme: null,
    draft: "saved draft",
  });
});

test("uploads a file above Vercel's request limit directly to GitHub", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem("kody-files-token", "test-token");
    localStorage.setItem("kody-files-repository", "octocat/hello-world");
  });
  await page.route("**/api/auth/token", (route) => route.fulfill({ json: { login: "octocat" } }));
  await page.route("**/api/repos", (route) => route.fulfill({ json: { repositories: [
    { owner: "octocat", repo: "hello-world", fullName: "octocat/hello-world", private: false },
  ] } }));
  await page.route("**/api/files", (route) => route.fulfill({ json: { result: [] } }));
  let serverUploads = 0;
  await page.route("**/api/files/upload", (route) => {
    serverUploads += 1;
    return route.fulfill({ status: 500 });
  });
  let githubWrites = 0;
  await page.route("https://api.github.com/**", (route) => {
    const request = route.request();
    const corsHeaders = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, PUT, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type, Accept, X-GitHub-Api-Version",
    };
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders });
    expect(request.method()).toBe("PUT");
    expect(request.url()).toBe("https://api.github.com/repos/octocat/hello-world/contents/large.bin");
    expect(request.headers().authorization).toContain("test-token");
    const body = request.postDataJSON();
    expect(body.message).toBe("chore: upload large.bin");
    expect(Buffer.from(body.content, "base64").length).toBe(5 * 1024 * 1024);
    githubWrites += 1;
    return route.fulfill({
      status: 201,
      headers: { ...corsHeaders, "content-type": "application/json" },
      json: { content: { sha: "uploaded-sha" }, commit: { sha: "commit-sha" } },
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
  await page.getByRole("button", { name: "More file actions" }).click();
  await page.getByRole("menuitem", { name: "Upload" }).click();
  await page.getByLabel("Choose files to upload").setInputFiles({
    name: "large.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(5 * 1024 * 1024, 0x5a),
  });
  await expect(page.getByText("Uploaded large.bin")).toBeVisible();
  expect(githubWrites).toBe(1);
  expect(serverUploads).toBe(0);
  expect(errors).toEqual([]);
});
