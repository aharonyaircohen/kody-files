# GitHub Files

A standalone browser app for browsing and editing files in a GitHub repository. It includes a tree, search, Monaco and Markdown editors, upload, create, rename, move, copy, delete, commit history, and file previews.

## Run

1. Create a GitHub personal access token with access to the repositories you want to use. For private repositories, grant repository contents read and write access; code search may need additional access.
2. Run `pnpm install` and `pnpm dev`.
3. Open `http://localhost:3335/files`, enter the token, then enter the repository owner and name.

No GitHub OAuth App or environment credentials are required. The token is stored in this browser tab's session storage so reloads and file navigation work. The app sends it in the Authorization header to its same-origin server route for each file operation. The server passes it to GitHub and does not save it. **Forget token** clears the tab's stored token and in-memory file cache. Closing the tab clears the session storage. Use HTTPS when hosting the app beyond localhost. Repository contents remain in GitHub; the app has no separate file database or dashboard dependency.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

The browser suite includes a mocked token and file journey. Its live GitHub read journey requires a running app at `http://localhost:3335` and a test process `GITHUB_TOKEN`; it enters that token in the UI.

The archive preview worker and Wasm files are in `public/vendor/libarchive`; their license is included beside them.
