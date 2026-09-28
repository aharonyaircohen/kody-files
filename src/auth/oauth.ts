import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const OAUTH_ATTEMPT_COOKIE = "ghf_oauth_attempt";
export const SESSION_COOKIE = "ghf_session";

export interface OAuthConfig {
  origin: string;
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
}

export function oauthConfig(): OAuthConfig | null {
  const { APP_ORIGIN, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET } =
    process.env;
  if (!APP_ORIGIN || !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !SESSION_SECRET) {
    return null;
  }
  try {
    const origin = new URL(APP_ORIGIN).origin;
    if (!origin.startsWith("https://") && origin !== "http://localhost:3335") {
      return null;
    }
    if (SESSION_SECRET.length < 32) return null;
    return {
      origin,
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      sessionSecret: SESSION_SECRET,
    };
  } catch {
    return null;
  }
}

export function callbackUrl(config: OAuthConfig): string {
  return `${config.origin}/api/auth/github/callback`;
}

export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/files") || value.startsWith("//")) {
    return "/files";
  }
  const url = new URL(value, "http://localhost");
  return url.origin === "http://localhost" &&
    (url.pathname === "/files" || url.pathname.startsWith("/files/"))
    ? `${url.pathname}${url.search}`
    : "/files";
}

export interface OAuthAttempt {
  state: string;
  verifier: string;
  returnPath: string;
}

export function createOAuthAttempt(returnPath: string): OAuthAttempt {
  return {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    returnPath: safeReturnPath(returnPath),
  };
}

export function encodeOAuthAttempt(attempt: OAuthAttempt): string {
  return Buffer.from(JSON.stringify(attempt)).toString("base64url");
}

export function decodeOAuthAttempt(value: string | undefined): OAuthAttempt | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof parsed.state === "string" &&
      typeof parsed.verifier === "string" &&
      typeof parsed.returnPath === "string" &&
      parsed.state.length >= 32 &&
      parsed.verifier.length >= 32
      ? { ...parsed, returnPath: safeReturnPath(parsed.returnPath) }
      : null;
  } catch {
    return null;
  }
}

export function validOAuthState(attempt: OAuthAttempt | null, received: string | null): boolean {
  if (!attempt || !received || received.length !== attempt.state.length) return false;
  return timingSafeEqual(Buffer.from(attempt.state), Buffer.from(received));
}

export function authorizationUrl(config: OAuthConfig, attempt: OAuthAttempt): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(config));
  url.searchParams.set("scope", "repo");
  url.searchParams.set("state", attempt.state);
  url.searchParams.set(
    "code_challenge",
    createHash("sha256").update(attempt.verifier).digest("base64url"),
  );
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function cookieOptions(config: OAuthConfig) {
  return {
    httpOnly: true,
    secure: config.origin.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
  };
}

export function sameOrigin(request: Request, config: OAuthConfig): boolean {
  return request.headers.get("origin") === config.origin;
}
