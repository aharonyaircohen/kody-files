import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(ts|tsx)$/.test(entry.name)
        ? [path]
        : [];
  });
}

describe("standalone File Manager boundary", () => {
  it("has no dashboard or monorepo imports", () => {
    const violations = sourceFiles(ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return [...source.matchAll(/(?:from\s+|import\()["'](@[^"']+)/g)]
        .map(([, specifier]) => specifier)
        .filter((specifier) =>
          specifier.startsWith("@dashboard/") || specifier.startsWith("@kody-ade/"),
        )
        .map((specifier) => ({ path, specifier }));
    });
    expect(violations).toEqual([]);
  });

  it("keeps GitHub storage behind the transport contract", () => {
    const core = readFileSync(join(ROOT, "file-manager/components/FilesPage.tsx"), "utf8");
    const host = readFileSync(join(ROOT, "app/files/FileManagerApp.tsx"), "utf8");
    const route = readFileSync(join(ROOT, "app/api/files/route.ts"), "utf8");
    expect(core).not.toContain("createGitHubFilesTransport");
    expect(host).toContain("createServerFilesTransport");
    expect(host).toContain("verifyToken");
    expect(route).toContain("createGitHubFilesTransport");
    expect(route).toContain("tokenFromRequest");
    expect(host).toContain("<FilesPage");
  });
});
