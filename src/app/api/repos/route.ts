import { Octokit } from "@octokit/rest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sameOrigin, tokenFromRequest } from "@/auth/token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = tokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "GitHub token required" }, { status: 401 });

  try {
    const octokit = new Octokit({ auth: token });
    const repositories = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
      affiliation: "owner,collaborator,organization_member",
      per_page: 100,
    });
    const result = repositories
      .map((repository) => ({
        owner: repository.owner.login,
        repo: repository.name,
        fullName: repository.full_name,
        private: repository.private,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return NextResponse.json({ repositories: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error &&
      typeof error.status === "number" ? error.status : 502;
    return NextResponse.json(
      { error: status === 401 ? "Invalid or expired GitHub token" : "Could not load repositories" },
      { status: status === 401 ? 401 : 502 },
    );
  }
}
