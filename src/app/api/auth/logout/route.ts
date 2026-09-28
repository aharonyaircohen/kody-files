import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { oauthConfig, sameOrigin, SESSION_COOKIE } from "@/auth/oauth";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  const config = oauthConfig();
  if (!config || !sameOrigin(request, config)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
