import { Octokit } from "@octokit/rest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fileRequest } from "@/auth/file-request";
import { sameOrigin, tokenFromRequest } from "@/auth/token";
import { createGitHubFilesTransport } from "@/file-manager/lib/github-files-transport";
import { getHttpStatus } from "@/file-manager/lib/repo-files";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const token = tokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "GitHub token required" }, { status: 401 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = fileRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid file request" }, { status: 400 });
  const input = parsed.data;
  const transport = createGitHubFilesTransport(
    new Octokit({ auth: token }),
    input.owner,
    input.repo,
  );
  try {
    let result: unknown;
    switch (input.op) {
      case "listDir": result = await transport.listDir(input.path); break;
      case "readFile": result = await transport.readFile(input.path); break;
      case "writeFile": result = await transport.writeFile!(input.path, input.content, { expectedVersion: input.expectedVersion }); break;
      case "deleteFile": result = await transport.deleteFile!(input.path, input.type); break;
      case "createFolder": result = await transport.createFolder!(input.path); break;
      case "movePath": result = await transport.movePath!(input.mutation); break;
      case "duplicatePath": result = await transport.duplicatePath!(input.mutation); break;
      case "search": result = await transport.search!(input.query); break;
      case "history": result = await transport.history!(input.path, input.limit); break;
      case "readVersion": result = await transport.readVersion!(input.path, input.version); break;
    }
    return NextResponse.json({ result: result ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = getHttpStatus(error);
    return NextResponse.json(
      { error: "GitHub file operation failed" },
      { status: status && status >= 400 && status < 600 ? status : 502 },
    );
  }
}
