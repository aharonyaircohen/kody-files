"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FilesPage } from "@/file-manager";
import { createServerFilesTransport } from "@/file-manager/lib/server-files-transport";

type AuthState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "signed-out" }
  | { status: "signed-in"; login: string };

export function FileManagerApp({ initialPath }: { initialPath: string }) {
  const [queryClient] = useState(() => new QueryClient());
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [target, setTarget] = useState<{ owner: string; repo: string } | null>(null);
  const [draft, setDraft] = useState({ owner: "", repo: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("auth_error");
    if (reason) setError("GitHub sign-in did not complete. Please try again.");
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session) => {
        if (!session.configured) setAuth({ status: "unconfigured" });
        else if (session.authenticated && typeof session.login === "string") {
          setAuth({ status: "signed-in", login: session.login });
          setDraft((current) => ({ ...current, owner: current.owner || session.login }));
        } else setAuth({ status: "signed-out" });
      })
      .catch(() => {
        setError("Could not check GitHub sign-in. Reload the page to try again.");
        setAuth({ status: "signed-out" });
      });
  }, []);

  const transport = useMemo(
    () => target ? createServerFilesTransport(target.owner, target.repo) : null,
    [target],
  );

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign-out failed");
      setTarget(null);
      setDraft({ owner: "", repo: "" });
      setAuth({ status: "signed-out" });
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (auth.status === "loading") {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Checking GitHub sign-in…</main>;
  }

  if (auth.status !== "signed-in") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <h1 className="text-3xl font-semibold">GitHub Files</h1>
        {error ? <p role="alert" className="mt-4 text-destructive">{error}</p> : null}
        {auth.status === "unconfigured" ? (
          <p className="mt-3 text-muted-foreground">GitHub sign-in is not configured for this app.</p>
        ) : (
          <>
            <p className="mt-3 text-muted-foreground">Sign in to browse and edit repositories you can access.</p>
            <a
              className="mt-8 rounded-lg bg-primary px-4 py-2 text-center font-medium text-primary-foreground"
              href="/api/auth/github/start"
            >
              Sign in with GitHub
            </a>
          </>
        )}
      </main>
    );
  }

  if (!target || !transport) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">GitHub Files</h1>
          <button className="text-sm text-muted-foreground hover:text-foreground" disabled={busy} onClick={signOut}>
            Sign out
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
            Sign out
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
