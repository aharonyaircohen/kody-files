"use client";

import { useEffect, useMemo, useState } from "react";
import { Octokit } from "@octokit/rest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FilesPage } from "@/file-manager";
import { createGitHubFilesTransport } from "@/file-manager/lib/github-files-transport";

export function FileManagerApp({ initialPath }: { initialPath: string }) {
  const [queryClient] = useState(() => new QueryClient());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [draft, setDraft] = useState({ token: "", owner: "", repo: "" });
  const transport = useMemo(
    () =>
      token && owner && repo
        ? createGitHubFilesTransport(new Octokit({ auth: token }), owner, repo)
        : null,
    [token, owner, repo],
  );

  if (!transport) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <h1 className="text-3xl font-semibold">GitHub Files</h1>
        <p className="mt-2 text-muted-foreground">
          Connect a repository to browse and edit its files. Your token stays in this browser tab's memory.
        </p>
        <form
          className="mt-8 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setToken(draft.token.trim());
            setOwner(draft.owner.trim());
            setRepo(draft.repo.trim());
          }}
        >
          <label className="grid gap-1.5 text-sm font-medium">
            GitHub token
            <input
              className="rounded-lg border border-border bg-card px-3 py-2"
              type="password"
              autoComplete="off"
              required
              value={draft.token}
              onChange={(event) => setDraft({ ...draft, token: event.target.value })}
            />
          </label>
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
          <button className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50" type="submit" disabled={!hydrated}>
            Open repository
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-2 text-sm">
        <strong>GitHub Files</strong>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            setToken("");
            setOwner("");
            setRepo("");
            setDraft({ token: "", owner: "", repo: "" });
          }}
        >
          Disconnect
        </button>
      </div>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-0 flex-1">
          <FilesPage
            key={`${owner}/${repo}`}
            initialPath={initialPath}
            title="Files"
            subtitle={`${owner}/${repo}`}
            routeBase="/files"
            transport={transport}
          />
        </div>
      </QueryClientProvider>
    </div>
  );
}
