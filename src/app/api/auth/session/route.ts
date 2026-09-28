import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { oauthConfig } from "@/auth/oauth";
import { sessionFromRequest } from "@/auth/session";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  return NextResponse.json(
    { configured: Boolean(oauthConfig()), authenticated: Boolean(session), login: session?.login ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
