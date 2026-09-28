import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/repos/route";

const paginate = vi.hoisted(() => vi.fn());
vi.mock("@octokit/rest", () => ({
  Octokit: class {
    repos = { listForAuthenticatedUser: "listForAuthenticatedUser" };
    paginate = paginate;
  },
}));

function request(origin: string, token?: string) {
  return new NextRequest("http://localhost:3335/api/repos", {
    method: "POST",
    headers: { origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

describe("repository picker API", () => {
  it("requires a same-origin request with a token", async () => {
    paginate.mockReset();
    expect((await POST(request("https://evil.example", "test-token"))).status).toBe(403);
    expect((await POST(request("http://localhost:3335"))).status).toBe(401);
    expect(paginate).not.toHaveBeenCalled();
  });

  it("lists every accessible repository and returns only picker fields", async () => {
    paginate.mockReset().mockResolvedValue([
      { owner: { login: "octocat" }, name: "z-repo", full_name: "octocat/z-repo", private: true, secret: "omit" },
      { owner: { login: "team" }, name: "a-repo", full_name: "team/a-repo", private: false },
    ]);
    const response = await POST(request("http://localhost:3335", "test-token"));
    expect(response.status).toBe(200);
    expect(paginate).toHaveBeenCalledWith("listForAuthenticatedUser", {
      affiliation: "owner,collaborator,organization_member", per_page: 100,
    });
    const body = await response.json();
    expect(body.repositories).toEqual([
      { owner: "octocat", repo: "z-repo", fullName: "octocat/z-repo", private: true },
      { owner: "team", repo: "a-repo", fullName: "team/a-repo", private: false },
    ]);
    expect(JSON.stringify(body)).not.toContain("test-token");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
