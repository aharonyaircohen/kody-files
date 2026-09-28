import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Octokit } from "@octokit/rest";
import { expect, test } from "@playwright/test";

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_FILES_TEST_REPO;
const sizeBytes = Number(process.env.GITHUB_FILES_LIVE_UPLOAD_BYTES ?? 5 * 1024 * 1024);

test.skip(!token || !repository || process.env.GITHUB_FILES_LIVE_UPLOAD !== "1", "Requires an explicit test repository and token");

test("uploads a large file through the mounted app and verifies it on GitHub", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  expect(Number.isInteger(sizeBytes) && sizeBytes > 0 && sizeBytes <= 100 * 1024 * 1024).toBe(true);
  const [owner, repo] = repository!.split("/");
  const path = `codex-direct-upload-${randomUUID()}.bin`;
  const tempDirectory = await mkdtemp(join(tmpdir(), "github-files-upload-"));
  const localPath = join(tempDirectory, path);
  const github = new Octokit({ auth: token! });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(`https://api.github.com/repos/${repository}/contents/${path}`)) {
      console.log(`GitHub upload response: ${response.status()}`);
    }
  });

  try {
    await writeFile(localPath, Buffer.alloc(sizeBytes, 0x5a));
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
    await page.getByLabel("Choose files to upload").setInputFiles(localPath);
    await Promise.race([
      page.getByText(`Uploaded ${path}`).waitFor({ state: "visible", timeout: 8 * 60_000 }),
      page.locator(".text-red-400").first().waitFor({ state: "visible", timeout: 8 * 60_000 }).then(async () => {
        throw new Error(`Upload failed: ${await page.locator(".text-red-400").first().textContent()}`);
      }),
    ]);
    const result = await github.repos.getContent({ owner: owner!, repo: repo!, path });
    expect(Array.isArray(result.data)).toBe(false);
    expect("size" in result.data ? result.data.size : 0).toBe(sizeBytes);
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
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }
});
