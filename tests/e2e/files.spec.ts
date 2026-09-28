import { expect, test } from "@playwright/test";

test("accepts a token, browses files, and forgets it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/auth/token", (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    return route.fulfill({ json: { login: "octocat" } });
  });
  await page.route("**/api/files", async (route) => {
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    const request = route.request().postDataJSON();
    const result = request.op === "listDir"
      ? [{ name: "README.md", path: "README.md", type: "file", size: 7, sha: "abc" }]
      : request.op === "readFile"
        ? {
            path: "README.md", sha: "abc", size: 7, content: "# Hello",
            base64Content: Buffer.from("# Hello").toString("base64"),
            isBinary: false, encoding: "base64",
          }
        : null;
    await route.fulfill({ json: { result } });
  });

  await page.goto("/files");
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  await page.getByLabel("GitHub token").fill("test-token");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("github-files-token"))).toBe("test-token");
  await page.reload();
  await expect(page.getByText("Signed in as octocat")).toBeVisible();
  await page.getByLabel("Owner").fill("octocat");
  await page.getByLabel("Repository").fill("hello-world");
  await page.getByRole("button", { name: "Open repository" }).click();
  await expect(page.getByText("README.md").first()).toBeVisible();
  await page.getByText("README.md").first().click();
  await expect(page.getByText("Hello", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Forget token" }).click();
  await expect(page.getByLabel("GitHub token")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("github-files-token"))).toBeNull();
  expect(errors).toEqual([]);
});
