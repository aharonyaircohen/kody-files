import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as filesPost } from "@/app/api/files/route";
import { POST as verifyToken } from "@/app/api/auth/token/route";

const listDir = vi.hoisted(() => vi.fn());
vi.mock("@/file-manager/lib/github-files-transport", () => ({
  createGitHubFilesTransport: () => ({ listDir }),
}));

const BODY = { owner: "octocat", repo: "hello-world", op: "listDir", path: "" };

function request(origin: string, token: string | null, body: unknown = BODY) {
  return new NextRequest("http://localhost:3335/api/files", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("file API token authorization", () => {
  it("rejects cross-origin and tokenless requests", async () => {
    listDir.mockReset();
    expect((await filesPost(request("https://evil.example", "test-token"))).status).toBe(403);
    expect((await filesPost(request("http://localhost:3335", null))).status).toBe(401);
    expect(listDir).not.toHaveBeenCalled();
  });

  it("validates operations and never returns the token", async () => {
    listDir.mockReset().mockResolvedValue([{ name: "README.md", path: "README.md", type: "file", size: 5, sha: "abc" }]);
    expect((await filesPost(request("http://localhost:3335", "test-token", { ...BODY, op: "deleteEverything" }))).status).toBe(400);
    expect((await filesPost(request("http://localhost:3335", "test-token", { ...BODY, path: "../outside" }))).status).toBe(400);
    const response = await filesPost(request("http://localhost:3335", "test-token"));
    expect(response.status).toBe(200);
    const payload = await response.text();
    expect(payload).toContain("README.md");
    expect(payload).not.toContain("test-token");
    expect(listDir).toHaveBeenCalledWith("");
  });

  it("verifies a user token with GitHub and returns only the login", async () => {
    const github = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ login: "octocat" }) });
    vi.stubGlobal("fetch", github);
    try {
      const response = await verifyToken(new NextRequest("http://localhost:3335/api/auth/token", {
        method: "POST",
        headers: { origin: "http://localhost:3335", Authorization: "Bearer test-token" },
      }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ login: "octocat" });
      expect(github.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not forward a cross-origin token verification request", async () => {
    const github = vi.fn();
    vi.stubGlobal("fetch", github);
    try {
      const response = await verifyToken(new NextRequest("http://localhost:3335/api/auth/token", {
        method: "POST",
        headers: { origin: "https://evil.example", Authorization: "Bearer test-token" },
      }));
      expect(response.status).toBe(403);
      expect(github).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
