import { expect, test } from "@playwright/test";

test("shows GitHub sign-in without asking for a token", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { configured: true, authenticated: false, login: null } }),
  );
  await page.goto("/files");
  const signIn = page.getByRole("link", { name: "Sign in with GitHub" });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", "/api/auth/github/start");
  await expect(page.getByLabel("GitHub token")).toHaveCount(0);
});

test("uses the session file API and signs out", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { configured: true, authenticated: true, login: "octocat" } }),
  );
  await page.route("**/api/files", async (route) => {
    const request = route.request().postDataJSON();
    const result = request.op === "listDir"
      ? [{ name: "README.md", path: "README.md", type: "file", size: 7, sha: "abc" }]
      : request.op === "readFile"
        ? {
            path: "README.md",
            sha: "abc",
            size: 7,
            content: "# Hello",
            base64Content: Buffer.from("# Hello").toString("base64"),
            isBinary: false,
            encoding: "base64",
          }
        : null;
    await route.fulfill({ json: { result } });
  });
  await page.route("**/api/auth/logout", (route) => route.fulfill({ json: { ok: true } }));

  await page.goto("/files");
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  await page.getByLabel("Owner").fill("octocat");
  await page.getByLabel("Repository").fill("hello-world");
  await page.getByRole("button", { name: "Open repository" }).click();
  await expect(page.getByText("README.md").first()).toBeVisible();
  await page.getByText("README.md").first().click();
  await expect(page.getByText("Hello", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in with GitHub" })).toBeVisible();
  expect(errors).toEqual([]);
});
