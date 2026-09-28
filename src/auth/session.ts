import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { oauthConfig, SESSION_COOKIE } from "./oauth";

export interface GitHubSession {
  token: string;
  login: string;
  expiresAt: number;
}

function key(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function sealSession(session: GitHubSession, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function openSession(value: string | undefined, secret: string): GitHubSession | null {
  if (!value) return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 3) return null;
    const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(secret), iv);
    decipher.setAuthTag(tag);
    const parsed = JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"),
    );
    return typeof parsed.token === "string" &&
      typeof parsed.login === "string" &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt > Date.now()
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function sessionFromRequest(request: NextRequest): GitHubSession | null {
  const config = oauthConfig();
  return config
    ? openSession(request.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret)
    : null;
}
