# GitHub Files

A standalone browser app for browsing and editing files in a GitHub repository. It includes a tree, search, Monaco and Markdown editors, upload, create, rename, move, copy, delete, commit history, and file previews.

## Run

1. Create a GitHub personal access token with access to the repositories you want to use. For private repositories, grant repository contents read and write access; code search may need additional access.
2. Run `pnpm install` and `pnpm dev`.
3. Open `http://localhost:3335/`, enter the token, then choose a repository from the searchable list. Use the repository dropdown in the file workspace to switch later. The header's **Forget token** icon clears the saved token. File links use `/?path=...` so repository paths cannot conflict with the app's API routes.

No GitHub OAuth App or environment credentials are required. Like Kody Chat's browser sign-in, the token is stored in local storage so it survives reloads and browser restarts. GitHub Files uses its own storage key and does not read Kody Chat's account state. It remembers the selected repository in the same browser. The app sends the token in the Authorization header to its same-origin server route for repository listing and file operations. The server passes it to GitHub and does not save it. **Forget token** clears the stored token, selected repository, and in-memory file cache. Use HTTPS when hosting the app beyond localhost. Repository contents remain in GitHub; the app has no separate file database or dashboard dependency.

The file workspace uses Kody Chat's light and dark color palette. The theme follows the browser's color preference unless this app has a saved `github-files-theme` preference. Markdown previews use the same shared renderer and Tailwind typography plugin as Kody Chat.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

The browser suite includes a mocked token and file journey. Its live GitHub read journey requires a running app at `http://localhost:3335/` and a test process `GITHUB_TOKEN`; it enters that token in the UI.

The archive preview worker and Wasm files are in `public/vendor/libarchive`; their license is included beside them.
