"use client";

import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogOut, SunMoon } from "lucide-react";
import { FilesPage } from "@/file-manager";
import { createServerFilesTransport } from "./server-files-transport";
import { Button } from "@/shared/ui/button";
import { RepositoryPicker, type RepositoryChoice } from "./RepositoryPicker";
import {
  LEGACY_REPOSITORY_KEY,
  LEGACY_THEME_KEY,
  LEGACY_TOKEN_KEY,
  migrateStoredValue,
  REPOSITORY_KEY,
  THEME_KEY,
  TOKEN_KEY,
} from "./browser-storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; login: string; token: string };

type ThemePreference = "auto" | "light" | "dark";

type RepositoryState =
  | { status: "loading" }
  | { status: "ready"; repositories: RepositoryChoice[] }
  | { status: "error" };

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

async function listRepositories(token: string): Promise<RepositoryChoice[]> {
  const response = await fetch("/api/repos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.repositories)) {
    throw new Error(payload.error ?? "Could not load repositories");
  }
  return payload.repositories;
}

export function FileManagerApp({ initialPath }: { initialPath: string }) {
  const [queryClient] = useState(() => new QueryClient());
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [tokenDraft, setTokenDraft] = useState("");
  const [target, setTarget] = useState<{ owner: string; repo: string } | null>(null);
  const [filePath, setFilePath] = useState(initialPath);
  const [repositoryState, setRepositoryState] = useState<RepositoryState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [themePreference, setThemePreference] = useState<ThemePreference>("auto");

  useEffect(() => {
    const stored = migrateStoredValue(localStorage, THEME_KEY, LEGACY_THEME_KEY);
    setThemePreference(stored === "light" || stored === "dark" ? stored : "auto");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      if (!localStorage.getItem(THEME_KEY)) {
        document.documentElement.setAttribute("data-theme", media.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", applySystemTheme);
    return () => media.removeEventListener("change", applySystemTheme);
  }, []);

  useEffect(() => {
    const stored = migrateStoredValue(localStorage, TOKEN_KEY, LEGACY_TOKEN_KEY);
    if (!stored) {
      setAuth({ status: "signed-out" });
      return;
    }
    verifyToken(stored)
      .then((login) => {
        setAuth({ status: "signed-in", login, token: stored });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setError("Saved token could not be verified. Enter a valid GitHub token.");
        setAuth({ status: "signed-out" });
      });
  }, []);

  useEffect(() => {
    if (auth.status !== "signed-in") return;
    let cancelled = false;
    setRepositoryState({ status: "loading" });
    listRepositories(auth.token)
      .then((repositories) => {
        if (cancelled) return;
        setRepositoryState({ status: "ready", repositories });
        const saved = migrateStoredValue(localStorage, REPOSITORY_KEY, LEGACY_REPOSITORY_KEY);
        const selected = repositories.find((repository) => repository.fullName === saved);
        if (saved && !selected) localStorage.removeItem(REPOSITORY_KEY);
        setTarget(selected ? { owner: selected.owner, repo: selected.repo } : null);
      })
      .catch(() => {
        if (!cancelled) setRepositoryState({ status: "error" });
      });
    return () => { cancelled = true; };
  }, [auth]);

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
      localStorage.setItem(TOKEN_KEY, token);
      setAuth({ status: "signed-in", login, token });
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REPOSITORY_KEY);
    queryClient.clear();
    setTarget(null);
    setRepositoryState({ status: "loading" });
    setAuth({ status: "signed-out" });
    setBusy(false);
  }

  function changeTheme(value: string) {
    if (value !== "auto" && value !== "light" && value !== "dark") return;
    setThemePreference(value);
    if (value === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, value);
    const resolved = value === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : value;
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function selectRepository(fullName: string) {
    if (repositoryState.status !== "ready") return;
    const selected = repositoryState.repositories.find((repository) => repository.fullName === fullName);
    if (!selected) return;
    localStorage.setItem(REPOSITORY_KEY, selected.fullName);
    queryClient.clear();
    setTarget({ owner: selected.owner, repo: selected.repo });
    setFilePath("");
    window.History.prototype.replaceState.call(window.history, null, "", "/");
  }

  const choices = repositoryState.status === "ready" ? repositoryState.repositories : [];
  const currentRepository = target ? `${target.owner}/${target.repo}` : "";
  const repositoryPicker = (compact: boolean) => (
    <RepositoryPicker
      repositories={choices}
      currentRepository={currentRepository}
      onSelect={selectRepository}
      compact={compact}
      disabled={repositoryState.status !== "ready" || choices.length === 0}
    />
  );

  const settingsMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Appearance" title="Appearance">
          <SunMoon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={themePreference} onValueChange={changeTheme}>
          <DropdownMenuRadioItem value="auto">System</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const forgetTokenButton = (
    <Button variant="ghost" size="icon" className="h-9 w-9" type="button" aria-label="Forget token" title="Forget token" disabled={busy} onClick={signOut}>
      <LogOut className="h-4 w-4" />
    </Button>
  );

  if (auth.status === "loading") {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Checking GitHub token…</main>;
  }

  if (auth.status !== "signed-in") {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Kody Files</h1>
          {settingsMenu()}
        </div>
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
        <p className="mt-4 text-sm text-muted-foreground">Saved in this browser until you choose Forget token.</p>
      </main>
    );
  }

  if (!target || !transport) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">Kody Files</h1>
          <div className="flex items-center gap-1">
            {settingsMenu()}
            {forgetTokenButton}
          </div>
        </div>
        <p className="mt-2 text-muted-foreground">Signed in as {auth.login}. Choose a repository to open.</p>
        {error ? <p role="alert" className="mt-4 text-destructive">{error}</p> : null}
        <div className="mt-8 grid gap-1.5 text-sm font-medium">
          <span>Repository</span>
          {repositoryPicker(false)}
        </div>
        {repositoryState.status === "loading" ? <p className="mt-3 text-sm text-muted-foreground">Loading repositories…</p> : null}
        {repositoryState.status === "error" ? <p role="alert" className="mt-3 text-sm text-destructive">Could not load repositories. Check this token&apos;s repository access and reload.</p> : null}
        {repositoryState.status === "ready" && choices.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No repositories are available to this token.</p> : null}
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {error ? <p role="alert" className="px-5 py-2 text-destructive">{error}</p> : null}
      <QueryClientProvider client={queryClient}>
        <div className="min-h-0 flex-1">
          <FilesPage
            key={`${target.owner}/${target.repo}`}
            initialPath={filePath}
            title="Files"
            subtitle=""
            routeBase="/"
            transport={transport}
            headerActions={() => (
              <div className="flex min-w-0 items-center gap-1">
                <div className="w-24 min-w-0 min-[380px]:w-36 sm:w-56">{repositoryPicker(true)}</div>
                {settingsMenu()}
                {forgetTokenButton}
              </div>
            )}
          />
        </div>
      </QueryClientProvider>
    </div>
  );
}
