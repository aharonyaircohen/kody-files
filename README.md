# GitHub Files

A standalone browser app for browsing and editing files in a GitHub repository. It includes a tree, search, Monaco and Markdown editors, upload, create, rename, move, copy, delete, commit history, and file previews.

## GitHub sign-in setup

1. Create a GitHub OAuth App in **GitHub Settings → Developer settings → OAuth Apps**. Use `http://localhost:3335` as the homepage URL and `http://localhost:3335/api/auth/github/callback` as the authorization callback URL for local development.
2. Copy `.env.example` to `.env.local`. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from the OAuth App. Generate `SESSION_SECRET` with `openssl rand -base64 32`. Keep these values out of Git.
3. Run `pnpm install` and `pnpm dev`, then open `http://localhost:3335/files`.

For another host, set `APP_ORIGIN` to its HTTPS origin and register its callback URL as `<origin>/api/auth/github/callback`. GitHub OAuth Apps request the `repo` scope to browse and edit private repositories; GitHub presents this access during authorization. Use a separate OAuth App registration when the local and hosted callback URLs cannot share one registration.

The app exchanges the OAuth code on the server using state and PKCE. It verifies the GitHub account, stores the access token in an encrypted HttpOnly cookie, and routes file operations through its own server. Browser JavaScript never receives the token. Sessions last at most 12 hours and sign-out clears the cookie. Repository contents remain in GitHub; the app has no separate file database or dashboard dependency.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

The browser suite includes mocked sign-in and file API journeys. Its live GitHub read journey requires a running app at `http://localhost:3335`, a test process `GITHUB_TOKEN`, and the same `SESSION_SECRET` used by that app. The live journey injects an encrypted test session; it does not exercise GitHub's authorization screen or code exchange.

The archive preview worker and Wasm files are in `public/vendor/libarchive`; their license is included beside them.
