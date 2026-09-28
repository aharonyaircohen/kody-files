# Development and testing

## Requirements

- Node.js 24
- pnpm 9 (the version is pinned in `package.json`)
- A browser supported by Playwright for browser tests

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3335/`. The normal app does not require `.env.local` or a server-side GitHub token. Use a restricted token and a disposable repository when exercising write operations.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The unit tests cover the file transport, path operations, previews, upload validation, and API behavior. The mocked browser tests exercise the mounted UI without a real token. Start the production build locally in another terminal, then run:

```bash
pnpm start
pnpm exec playwright install chromium
pnpm exec playwright test tests/e2e/files.spec.ts
```

The optional live tests use an actual GitHub token and an existing test repository. The upload test creates a temporary file and deletes it afterward, but those commits remain in the repository's history. **Use only a disposable test repository.**

```bash
GITHUB_TOKEN=... GITHUB_FILES_TEST_REPO=owner/disposable-repo \
  pnpm exec playwright test tests/e2e/live-brand-migration.spec.ts

GITHUB_TOKEN=... GITHUB_FILES_TEST_REPO=owner/disposable-repo \
  GITHUB_FILES_LIVE_UPLOAD=1 \
  pnpm exec playwright test tests/e2e/live-direct-upload.spec.ts
```

Do not put a token in a committed file or paste it into a public issue. The CI workflow runs lint, typecheck, unit tests, build, and mocked browser tests without credentials.

## Documentation screenshots

The checked-in screenshots are generated from mock API responses and a fake token. Start the local app, then run:

```bash
pnpm screenshots
```

This writes PNGs under `docs/screenshots/`. Review them before committing any regenerated images. The script never calls GitHub.
