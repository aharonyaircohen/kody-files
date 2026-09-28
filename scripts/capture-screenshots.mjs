import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3335";
const output = join(process.cwd(), "docs", "screenshots");
const readme = `# Project notes

Keep your repository files organized in one workspace. Open Markdown to read a formatted preview, then switch to the editor to make changes.

## What you can do

- Browse folders and search repository content.
- Edit Markdown and code with a preview.
- Upload, create, move, copy, and delete files.

> Your files stay in your GitHub repository.
`;

await mkdir(output, { recursive: true });
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light" });
  await page.route("**/api/auth/token", (route) => route.fulfill({ json: { login: "sample-user" } }));
  await page.route("**/api/repos", (route) => route.fulfill({ json: { repositories: [
    { owner: "sample-org", repo: "project-notes", fullName: "sample-org/project-notes", private: false },
    { owner: "sample-org", repo: "design-assets", fullName: "sample-org/design-assets", private: false },
  ] } }));
  await page.route("**/api/files", (route) => {
    const request = route.request().postDataJSON();
    const result = request.op === "listDir"
      ? request.path === "docs"
        ? [{ name: "guide.md", path: "docs/guide.md", type: "file", size: 152, sha: "guide-sha" }]
        : [
            { name: "docs", path: "docs", type: "dir", sha: "docs-sha" },
            { name: "README.md", path: "README.md", type: "file", size: readme.length, sha: "readme-sha" },
            { name: "notes.md", path: "notes.md", type: "file", size: 120, sha: "notes-sha" },
          ]
      : request.op === "readFile"
        ? {
            path: "README.md", sha: "readme-sha", size: readme.length, content: readme,
            base64Content: Buffer.from(readme).toString("base64"), isBinary: false, encoding: "base64",
          }
        : null;
    return route.fulfill({ json: { result } });
  });

  await page.goto(baseURL);
  await page.getByLabel("GitHub token").waitFor();
  await page.screenshot({ path: join(output, "sign-in.png"), animations: "disabled" });

  await page.evaluate(() => {
    localStorage.setItem("kody-files-token", "sample-token-not-valid");
    localStorage.setItem("kody-files-repository", "sample-org/project-notes");
  });
  await page.reload();
  await page.getByRole("heading", { name: "Files" }).waitFor();
  await page.getByText("README.md").first().click();
  await page.getByRole("button", { name: "View mode" }).click();
  await page.locator(".prose h1").waitFor();
  await page.screenshot({ path: join(output, "workspace-light.png"), animations: "disabled" });

  await page.getByRole("button", { name: "Repository" }).click();
  await page.getByRole("searchbox", { name: "Search repositories" }).waitFor();
  await page.screenshot({ path: join(output, "repository-picker.png"), animations: "disabled" });
  await page.getByRole("searchbox", { name: "Search repositories" }).press("Escape");

  await page.getByRole("button", { name: "Appearance" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await page.locator("html[data-theme='dark']").waitFor();
  await page.screenshot({ path: join(output, "workspace-dark.png"), animations: "disabled" });
} finally {
  await browser.close();
}
