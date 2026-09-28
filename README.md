# GitHub Files

A standalone browser app for browsing and editing files in a GitHub repository. It includes a tree, search, Monaco and Markdown editors, upload, create, rename, move, copy, delete, commit history, and file previews.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3335/files`. Enter a GitHub token with access to the target repository, then its owner and repository name. The token is kept in browser memory and is discarded when the page reloads or you disconnect. For a fine-grained token, grant **Contents: Read and write** to repositories you intend to edit. Search and history may require additional repository access.

The app calls GitHub directly from the browser. It has no server-side file storage or dashboard dependency. Repository contents remain in GitHub. The GitHub adapter implements the `FilesTransport` interface in `src/file-manager/lib/transport.tsx`; other storage providers can implement the same interface.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
GITHUB_TOKEN=... pnpm test:e2e
```

The browser journey opens a real GitHub repository and reads `README.md`. It requires a running app at `http://localhost:3335` and a GitHub token in the test process.

The archive preview worker and Wasm files are in `public/vendor/libarchive`; their license is included beside them.
