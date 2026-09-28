# Contributing

Thanks for helping improve Kody Files. Please keep changes focused and explain the user-facing behavior they affect.

## Set up

1. Use Node.js 24 and pnpm 9.
2. Run `pnpm install --frozen-lockfile` and `pnpm dev`.
3. Open `http://localhost:3335/`. Use a token with access only to a disposable test repository when trying write operations.

See [development and testing](docs/development.md) for the project structure and test commands.

## Before opening a pull request

- Add or update a regression test for behavior changes.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- For UI changes, run the browser tests against the local app and include a screenshot when it clarifies the change.
- Do not commit tokens, private repository contents, `.env.local`, Playwright storage state, or screenshots from a real private repository.
- Describe what changed, how you verified it, and any limitations in the pull request.

The reusable file manager lives in `src/file-manager`. Keep GitHub-specific behavior in the app adapter or transport rather than adding repository assumptions to shared UI components.

## Issues

Use the issue templates for bugs and feature requests. Remove tokens and private file content from logs or screenshots before sharing them. Report security issues privately as described in [SECURITY.md](SECURITY.md).
