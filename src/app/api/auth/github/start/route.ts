import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  authorizationUrl,
  cookieOptions,
  createOAuthAttempt,
  encodeOAuthAttempt,
  oauthConfig,
  OAUTH_ATTEMPT_COOKIE,
} from "@/auth/oauth";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const config = oauthConfig();
  if (!config) return new NextResponse("GitHub OAuth is not configured", { status: 503 });
  const attempt = createOAuthAttempt(request.nextUrl.searchParams.get("next") ?? "/files");
  const response = NextResponse.redirect(authorizationUrl(config, attempt));
  response.cookies.set(OAUTH_ATTEMPT_COOKIE, encodeOAuthAttempt(attempt), {
    ...cookieOptions(config),
    maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
