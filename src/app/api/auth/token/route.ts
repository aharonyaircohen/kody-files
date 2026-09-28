import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sameOrigin, tokenFromRequest } from "@/auth/token";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = tokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "GitHub token required" }, { status: 401 });

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 401 ? "Invalid or expired GitHub token" : "Could not verify GitHub token" },
        { status: response.status === 401 ? 401 : 502 },
      );
    }
    const user: unknown = await response.json();
    if (!user || typeof user !== "object" || !("login" in user) || typeof user.login !== "string") {
      return NextResponse.json({ error: "Could not verify GitHub token" }, { status: 502 });
    }
    return NextResponse.json({ login: user.login }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not verify GitHub token" }, { status: 502 });
  }
}
