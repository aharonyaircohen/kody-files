"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FilesPage } from "@/file-manager";
import { createServerFilesTransport } from "@/file-manager/lib/server-files-transport";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; login: string; token: string };

const TOKEN_KEY = "github-files-token";

async function verifyToken(token: string): Promise<string> {
  const response = await fetch("/api/auth/token", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.login !== "string") {
    throw new Error(payload.error ?? "Could not verify GitHub token");
  }
  return payload.login;
}

export function FileManagerApp({ initialPath }: { initialPath: string }) {
  const [queryClient] = useState(() => new QueryClient());
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [tokenDraft, setTokenDraft] = useState("");
  const [target, setTarget] = useState<{ owner: string; repo: string } | null>(null);
  const [draft, setDraft] = useState({ owner: "", repo: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setAuth({ status: "signed-out" });
      return;
    }
    verifyToken(stored)
      .then((login) => {
        setAuth({ status: "signed-in", login, token: stored });
        setDraft((current) => ({ ...current, owner: current.owner || login }));
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
        setError("Saved token could not be verified. Enter a valid GitHub token.");
        setAuth({ status: "signed-out" });
      });
  }, []);

  const transport = useMemo(
    () => target && auth.status === "signed-in"
      ? createServerFilesTransport(target.owner, target.repo, auth.token)
      : null,
    [target, auth],
  );

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = tokenDraft.trim();
      const login = await verifyToken(token);
      sessionStorage.setItem(TOKEN_KEY, token);
      setAuth({ status: "signed-in", login, token });
      setDraft((current) => ({ ...current, owner: current.owner || login }));
      setTokenDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify GitHub token");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setBusy(true);
    setError("");
    sessionStorage.removeItem(TOKEN_KEY);
    queryClient.clear();
    setTarget(null);
    setDraft({ owner: "", repo: "" });
    setAuth({ status: "signed-out" });
    setBusy(false);
  }

  if (auth.status === "loading") {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Checking GitHub token…</main>;
  }

  if (auth.status !== "signed-in") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <h1 className="text-3xl font-semibold">GitHub Files</h1>
        {error ? <p role="alert" className="mt-4 text-destructive">{error}</p> : null}
        <p className="mt-3 text-muted-foreground">Enter a GitHub personal access token to browse and edit repositories it can access.</p>
        <form className="mt-8 grid gap-4" onSubmit={signIn}>
          <label className="grid gap-1.5 text-sm font-medium">
            GitHub token
            <input
              className="rounded-lg border border-border bg-card px-3 py-2"
              type="password"
              autoComplete="off"
              required
              value={tokenDraft}
              onChange={(event) => setTokenDraft(event.target.value)}
            />
          </label>
          <button className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground" type="submit" disabled={busy}>
            {busy ? "Checking token…" : "Continue"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">Stored only in this browser tab until you close it or choose Forget token.</p>
      </main>
    );
  }

  if (!target || !transport) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">GitHub Files</h1>
          <button className="text-sm text-muted-foreground hover:text-foreground" disabled={busy} onClick={signOut}>
            Forget token
          </button>
        </div>
        <p className="mt-2 text-muted-foreground">Signed in as {auth.login}. Enter a repository to open.</p>
        {error ? <p role="alert" className="mt-4 text-destructive">{error}</p> : null}
        <form
          className="mt-8 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setTarget({ owner: draft.owner.trim(), repo: draft.repo.trim() });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Owner
              <input
                className="rounded-lg border border-border bg-card px-3 py-2"
                required
                value={draft.owner}
                onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Repository
              <input
                className="rounded-lg border border-border bg-card px-3 py-2"
                required
                value={draft.repo}
                onChange={(event) => setDraft({ ...draft, repo: event.target.value })}
              />
            </label>
          </div>
          <button className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground" type="submit">
            Open repository
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-2 text-sm">
        <strong>GitHub Files</strong>
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-foreground" onClick={() => setTarget(null)}>
            Change repository
          </button>
          <button className="text-muted-foreground hover:text-foreground" disabled={busy} onClick={signOut}>
            Forget token
          </button>
        </div>
      </div>
      {error ? <p role="alert" className="px-5 py-2 text-destructive">{error}</p> : null}
      <QueryClientProvider client={queryClient}>
        <div className="min-h-0 flex-1">
          <FilesPage
            key={`${target.owner}/${target.repo}`}
            initialPath={initialPath}
            title="Files"
            subtitle={`${target.owner}/${target.repo}`}
            routeBase="/files"
            transport={transport}
          />
        </div>
      </QueryClientProvider>
    </div>
  );
}
