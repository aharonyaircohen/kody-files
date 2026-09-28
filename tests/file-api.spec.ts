import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { sealSession } from "@/auth/session";
import { POST as filesPost } from "@/app/api/files/route";

const listDir = vi.hoisted(() => vi.fn());
vi.mock("@/file-manager/lib/github-files-transport", () => ({
  createGitHubFilesTransport: () => ({ listDir }),
}));

const SECRET = "0123456789abcdef0123456789abcdef";
const BODY = { owner: "octocat", repo: "hello-world", op: "listDir", path: "" };

function request(origin: string, authenticated: boolean, body: unknown = BODY) {
  const cookie = authenticated
    ? `ghf_session=${sealSession({ token: "server-only-token", login: "octocat", expiresAt: Date.now() + 60_000 }, SECRET)}`
    : "";
  return new NextRequest("http://localhost:3335/api/files", {
    method: "POST",
    headers: { origin, "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "http://localhost:3335");
  vi.stubEnv("GITHUB_CLIENT_ID", "test-client");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-secret");
  vi.stubEnv("SESSION_SECRET", SECRET);
  listDir.mockReset().mockResolvedValue([{ name: "README.md", path: "README.md", type: "file", size: 5, sha: "abc" }]);
});

afterEach(() => vi.unstubAllEnvs());

describe("file API authorization", () => {
  it("rejects cross-origin requests even with a valid session", async () => {
    const response = await filesPost(request("https://evil.example", true));
    expect(response.status).toBe(403);
    expect(listDir).not.toHaveBeenCalled();
  });

  it("requires a signed-in session and validates the operation", async () => {
    expect((await filesPost(request("http://localhost:3335", false))).status).toBe(401);
    expect((await filesPost(request("http://localhost:3335", true, { ...BODY, op: "deleteEverything" }))).status).toBe(400);
    expect((await filesPost(request("http://localhost:3335", true, { ...BODY, path: "../outside" }))).status).toBe(400);
    expect(listDir).not.toHaveBeenCalled();
  });

  it("serves a valid request without returning the OAuth token", async () => {
    const response = await filesPost(request("http://localhost:3335", true));
    expect(response.status).toBe(200);
    const payload = await response.text();
    expect(payload).toContain("README.md");
    expect(payload).not.toContain("server-only-token");
    expect(listDir).toHaveBeenCalledWith("");
  });
});
