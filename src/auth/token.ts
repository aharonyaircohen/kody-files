import type { NextRequest } from "next/server";

export function sameOrigin(request: NextRequest): boolean {
  return request.headers.get("origin") === request.nextUrl.origin;
}

export function tokenFromRequest(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  const match = /^Bearer ([^\s]{1,512})$/.exec(authorization ?? "");
  return match?.[1] ?? null;
}
