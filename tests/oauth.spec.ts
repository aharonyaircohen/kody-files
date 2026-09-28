import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  authorizationUrl,
  createOAuthAttempt,
  decodeOAuthAttempt,
  encodeOAuthAttempt,
  oauthConfig,
  safeReturnPath,
  SESSION_COOKIE,
  validOAuthState,
} from "@/auth/oauth";
import { openSession, sealSession } from "@/auth/session";
import { GET as start } from "@/app/api/auth/github/start/route";
import { GET as callback } from "@/app/api/auth/github/callback/route";
import { GET as getSession } from "@/app/api/auth/session/route";
import { POST as logout } from "@/app/api/auth/logout/route";

const SECRET = "0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "http://localhost:3335");
  vi.stubEnv("GITHUB_CLIENT_ID", "test-client");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-secret");
  vi.stubEnv("SESSION_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GitHub OAuth", () => {
  it("creates a state-bound PKCE authorization and confines return paths", () => {
    const config = oauthConfig()!;
    const attempt = createOAuthAttempt("https://evil.example/steal");
    const url = new URL(authorizationUrl(config, attempt));
    expect(url.origin).toBe("https://github.com");
    expect(url.searchParams.get("scope")).toBe("repo");
    expect(url.searchParams.get("state")).toBe(attempt.state);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toHaveLength(43);
    expect(attempt.returnPath).toBe("/files");
    expect(safeReturnPath("/files/docs/a.md?view=source")).toBe("/files/docs/a.md?view=source");
    expect(validOAuthState(decodeOAuthAttempt(encodeOAuthAttempt(attempt)), attempt.state)).toBe(true);
    expect(validOAuthState(attempt, "incorrect-state")).toBe(false);
  });

  it("rejects callbacks with missing or mismatched state without exchanging a code", async () => {
    const exchange = vi.fn();
    vi.stubGlobal("fetch", exchange);
    const attempt = createOAuthAttempt("/files");
    const request = new NextRequest("http://localhost:3335/api/auth/github/callback?code=abc&state=wrong", {
      headers: { cookie: `ghf_oauth_attempt=${encodeOAuthAttempt(attempt)}` },
    });
    const response = await callback(request);
    expect(response.headers.get("location")).toContain("auth_error=invalid_state");
    expect(response.cookies.get("ghf_oauth_attempt")?.value).toBe("");
    expect(exchange).not.toHaveBeenCalled();
  });

  it("exchanges a valid code, revalidates identity, and seals the token in an HttpOnly cookie", async () => {
    const attempt = createOAuthAttempt("/files/docs");
    const exchange = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "oauth-test-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ login: "octocat" }) });
    vi.stubGlobal("fetch", exchange);
    const request = new NextRequest(`http://localhost:3335/api/auth/github/callback?code=abc&state=${attempt.state}`, {
      headers: { cookie: `ghf_oauth_attempt=${encodeOAuthAttempt(attempt)}` },
    });
    const response = await callback(request);
    expect(response.headers.get("location")).toBe("http://localhost:3335/files/docs");
    expect(exchange).toHaveBeenCalledTimes(2);
    const cookie = response.cookies.get(SESSION_COOKIE)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(cookie.value).not.toContain("oauth-test-token");
    expect(openSession(cookie.value, SECRET)?.login).toBe("octocat");
    expect(openSession(cookie.value, SECRET)?.token).toBe("oauth-test-token");
  });

  it("rejects tampered and expired sessions", () => {
    const sealed = sealSession({ token: "oauth-test-token", login: "octocat", expiresAt: Date.now() + 1000 }, SECRET);
    expect(openSession(sealed, SECRET)?.login).toBe("octocat");
    expect(openSession(`${sealed.slice(0, -1)}x`, SECRET)).toBeNull();
    expect(openSession(sealSession({ token: "x", login: "octocat", expiresAt: Date.now() - 1 }, SECRET), SECRET)).toBeNull();
  });

  it("returns identity without the token and clears the cookie on sign-out", async () => {
    const cookie = sealSession({ token: "oauth-test-token", login: "octocat", expiresAt: Date.now() + 60_000 }, SECRET);
    const session = getSession(new NextRequest("http://localhost:3335/api/auth/session", {
      headers: { cookie: `${SESSION_COOKIE}=${cookie}` },
    }));
    expect(await session.json()).toEqual({ configured: true, authenticated: true, login: "octocat" });
    const response = logout(new NextRequest("http://localhost:3335/api/auth/logout", {
      method: "POST",
      headers: { origin: "http://localhost:3335", cookie: `${SESSION_COOKIE}=${cookie}` },
    }));
    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
  });

  it("sets a short-lived HttpOnly state cookie at sign-in start", () => {
    const response = start(new NextRequest("http://localhost:3335/api/auth/github/start?next=%2Ffiles%2FREADME.md"));
    expect(response.headers.get("location")).toContain("github.com/login/oauth/authorize");
    const cookie = response.cookies.get("ghf_oauth_attempt")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.maxAge).toBe(600);
    expect(decodeOAuthAttempt(cookie.value)?.returnPath).toBe("/files/README.md");
  });
});
