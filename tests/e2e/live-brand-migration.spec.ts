import { expect, test } from "@playwright/test";

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_FILES_TEST_REPO;

test.skip(!token || !repository, "Requires an existing GitHub token and accessible repository");

test("migrates saved GitHub Files settings in the signed-in app", async ({ page }) => {
  const repoName = repository!.split("/")[1];
  await page.addInitScript(({ savedToken, savedRepository }) => {
    localStorage.setItem("github-files-token", savedToken);
    localStorage.setItem("github-files-repository", savedRepository);
    localStorage.setItem("github-files-theme", "light");
    localStorage.setItem(`github-files:file-draft:${savedRepository}/note.md`, "saved draft");
  }, { savedToken: token!, savedRepository: repository! });
  await page.emulateMedia({ colorScheme: "dark" });

  await page.goto("/");
  await expect(page).toHaveTitle("Kody Files");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Repository" })).toContainText(repoName!);
  expect(await page.evaluate((savedRepository) => ({
    tokenMigrated: localStorage.getItem("kody-files-token") !== null,
    repository: localStorage.getItem("kody-files-repository"),
    theme: localStorage.getItem("kody-files-theme"),
    oldToken: localStorage.getItem("github-files-token"),
    oldRepository: localStorage.getItem("github-files-repository"),
    oldTheme: localStorage.getItem("github-files-theme"),
    draft: localStorage.getItem(`github-files:file-draft:${savedRepository}/note.md`),
  }), repository!)).toEqual({
    tokenMigrated: true,
    repository,
    theme: "light",
    oldToken: null,
    oldRepository: null,
    oldTheme: null,
    draft: "saved draft",
  });
});
