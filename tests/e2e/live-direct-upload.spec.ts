import { randomUUID } from "node:crypto";
import { Octokit } from "@octokit/rest";
import { expect, test } from "@playwright/test";

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_FILES_TEST_REPO;

test.skip(!token || !repository || process.env.GITHUB_FILES_LIVE_UPLOAD !== "1", "Requires an explicit test repository and token");

test("uploads a large file through the mounted app and verifies it on GitHub", async ({ page }) => {
  const [owner, repo] = repository!.split("/");
  const path = `codex-direct-upload-${randomUUID()}.bin`;
  const github = new Octokit({ auth: token! });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await page.goto("/");
    await page.getByLabel("GitHub token").fill(token!);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: "Repository" })).toBeVisible();
    await page.getByRole("button", { name: "Repository" }).click();
    await page.getByRole("searchbox", { name: "Search repositories" }).fill(repository!);
    await page.getByRole("option", { name: repo }).click();
    await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
    await page.getByRole("button", { name: "More file actions" }).click();
    await page.getByRole("menuitem", { name: "Upload" }).click();
    await page.getByLabel("Choose files to upload").setInputFiles({
      name: path,
      mimeType: "application/octet-stream",
      buffer: Buffer.alloc(5 * 1024 * 1024, 0x5a),
    });
    await expect(page.getByText(`Uploaded ${path}`)).toBeVisible({ timeout: 120_000 });
    const result = await github.repos.getContent({ owner: owner!, repo: repo!, path });
    expect(Array.isArray(result.data)).toBe(false);
    expect("size" in result.data ? result.data.size : 0).toBe(5 * 1024 * 1024);
    expect(errors).toEqual([]);
  } finally {
    try {
      const result = await github.repos.getContent({ owner: owner!, repo: repo!, path });
      if (!Array.isArray(result.data) && "sha" in result.data) {
        await github.repos.deleteFile({
          owner: owner!, repo: repo!, path, sha: result.data.sha,
          message: `test: clean up ${path}`,
        });
      }
    } catch (error) {
      if (!(error && typeof error === "object" && "status" in error && error.status === 404)) {
        throw error;
      }
    }
  }
});
