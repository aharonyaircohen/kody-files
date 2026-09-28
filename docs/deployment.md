# Deployment

Kody Files runs as a Next.js app. The maintained deployment is [files.thedigitalreality.app](https://files.thedigitalreality.app/) on Vercel, but the repository does not require that domain or Vercel account.

## Vercel

1. Fork or clone the repository and connect it to your own Vercel project, or run `vercel link` in the checkout.
2. Keep the framework setting on Next.js. The included `vercel.json` selects it.
3. Deploy with `vercel deploy --prod`, or let your connected Git repository deploy on push.
4. Add your own HTTPS domain in the Vercel project settings if desired.

No GitHub token, OAuth client ID, or OAuth secret needs to be configured in Vercel. Each user enters a token in their own browser. Do not add a shared token as a project environment variable.

## Other hosts

Install dependencies with `pnpm install --frozen-lockfile`, run `pnpm build`, and serve with `pnpm start`. The host must support Next.js Node.js routes for `/api/auth/token`, `/api/repos`, and `/api/files`. Use HTTPS outside localhost.

Before sharing a deployment, verify sign-in, repository selection, a read, and a small upload using a disposable repository. Read [SECURITY.md](../SECURITY.md) for the token trust boundary and [architecture](architecture.md) for request flow and upload limits.

If you make a fork public, enable GitHub's private vulnerability reporting in the repository security settings so the reporting path in `SECURITY.md` is available to researchers.
