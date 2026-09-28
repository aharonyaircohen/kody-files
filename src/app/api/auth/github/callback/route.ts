import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  callbackUrl,
  cookieOptions,
  decodeOAuthAttempt,
  oauthConfig,
  OAUTH_ATTEMPT_COOKIE,
  SESSION_COOKIE,
  validOAuthState,
} from "@/auth/oauth";
import { sealSession } from "@/auth/session";

export const runtime = "nodejs";

function failure(origin: string, reason: string): NextResponse {
  const url = new URL("/files", origin);
  url.searchParams.set("auth_error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const config = oauthConfig();
  if (!config) return new NextResponse("GitHub OAuth is not configured", { status: 503 });
  const attempt = decodeOAuthAttempt(request.cookies.get(OAUTH_ATTEMPT_COOKIE)?.value);
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const denied = request.nextUrl.searchParams.has("error");
  const invalid = denied || !validOAuthState(attempt, state) || !code;
  const clearAttempt = (response: NextResponse) => {
    response.cookies.delete(OAUTH_ATTEMPT_COOKIE);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  if (invalid) return clearAttempt(failure(config.origin, denied ? "denied" : "invalid_state"));

  try {
    const exchange = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: callbackUrl(config),
        code_verifier: attempt!.verifier,
      }),
      cache: "no-store",
    });
    if (!exchange.ok) return clearAttempt(failure(config.origin, "exchange_failed"));
    const credentials = await exchange.json();
    if (typeof credentials.access_token !== "string" || !credentials.access_token) {
      return clearAttempt(failure(config.origin, "exchange_failed"));
    }
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${credentials.access_token}`,
      },
      cache: "no-store",
    });
    if (!userResponse.ok) return clearAttempt(failure(config.origin, "identity_failed"));
    const user = await userResponse.json();
    if (typeof user.login !== "string" || !user.login) {
      return clearAttempt(failure(config.origin, "identity_failed"));
    }

    const lifetimeSeconds = Math.min(
      12 * 60 * 60,
      typeof credentials.expires_in === "number" ? credentials.expires_in : 12 * 60 * 60,
    );
    const response = NextResponse.redirect(new URL(attempt!.returnPath, config.origin));
    response.cookies.set(
      SESSION_COOKIE,
      sealSession(
        {
          token: credentials.access_token,
          login: user.login,
          expiresAt: Date.now() + lifetimeSeconds * 1000,
        },
        config.sessionSecret,
      ),
      { ...cookieOptions(config), maxAge: lifetimeSeconds },
    );
    return clearAttempt(response);
  } catch {
    return clearAttempt(failure(config.origin, "exchange_failed"));
  }
}
