import { Octokit } from "@octokit/rest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isSafeRepoPath, repository } from "@/auth/file-request";
import { oauthConfig, sameOrigin } from "@/auth/oauth";
import { sessionFromRequest } from "@/auth/session";
import { createGitHubFilesTransport } from "@/file-manager/lib/github-files-transport";
import { getHttpStatus } from "@/file-manager/lib/repo-files";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const config = oauthConfig();
  if (!config || !sameOrigin(request, config)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const session = sessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Multipart form required" }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > 140 * 1024 * 1024) {
    return NextResponse.json({ error: "Upload too large" }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const target = repository.safeParse({ owner: form.get("owner"), repo: form.get("repo") });
  const path = form.get("path");
  const file = form.get("file");
  if (!target.success || typeof path !== "string" || !path || path.length > 2048 || !isSafeRepoPath(path) || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "Upload too large" }, { status: 413 });
  }
  const transport = createGitHubFilesTransport(
    new Octokit({ auth: session.token }),
    target.data.owner,
    target.data.repo,
  );
  try {
    const result = await transport.uploadFile!(path, file);
    return NextResponse.json({ result: result ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = getHttpStatus(error);
    return NextResponse.json(
      { error: "GitHub upload failed" },
      { status: status && status >= 400 && status < 600 ? status : 502 },
    );
  }
}
