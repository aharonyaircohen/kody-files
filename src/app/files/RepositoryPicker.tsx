"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, FolderGit2, LockKeyhole, Search } from "lucide-react";

export interface RepositoryChoice {
  owner: string;
  repo: string;
  fullName: string;
  private: boolean;
}

interface RepositoryPickerProps {
  repositories: RepositoryChoice[];
  currentRepository: string;
  onSelect: (fullName: string) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function RepositoryPicker({
  repositories,
  currentRepository,
  onSelect,
  compact = false,
  disabled = false,
}: RepositoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = repositories.filter((repository) =>
    repository.fullName.toLocaleLowerCase().includes(normalizedQuery),
  );
  const groups = new Map<string, RepositoryChoice[]>();
  for (const repository of filtered) {
    const group = groups.get(repository.owner) ?? [];
    group.push(repository);
    groups.set(repository.owner, group);
  }
  const current = repositories.find((repository) => repository.fullName === currentRepository);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function choose(fullName: string) {
    onSelect(fullName);
    close();
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!filtered.length) return;
      setActiveIndex((index) =>
        event.key === "ArrowDown"
          ? (index + 1) % filtered.length
          : (index - 1 + filtered.length) % filtered.length,
      );
    } else if (event.key === "Enter" && filtered.length) {
      event.preventDefault();
      choose(filtered[Math.min(activeIndex, filtered.length - 1)].fullName);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Repository"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen);
          setQuery("");
          setActiveIndex(0);
        }}
        title={currentRepository || "Select a repository"}
        className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">
          {current ? (compact ? current.repo : current.fullName) : "Select a repository"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <div className={`z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl ${compact ? "fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-[min(22rem,calc(100vw-2rem))]" : "absolute left-0 top-full w-[min(22rem,calc(100vw-2rem))]"}`}>
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              aria-label="Search repositories"
              aria-controls={listId}
              aria-activedescendant={filtered.length ? `${listId}-option-${Math.min(activeIndex, filtered.length - 1)}` : undefined}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search repositories"
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div id={listId} role="listbox" aria-label="Repositories" className="max-h-72 overflow-y-auto p-1">
            {filtered.length ? Array.from(groups, ([owner, ownerRepositories]) => (
              <div key={owner} role="group" aria-label={`${owner} repositories`} className="py-1">
                <div className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{owner}</div>
                {ownerRepositories.map((repository) => {
                  const index = filtered.indexOf(repository);
                  const selected = repository.fullName === currentRepository;
                  return (
                    <button
                      key={repository.fullName}
                      id={`${listId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => choose(repository.fullName)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${activeIndex === index ? "bg-accent/60" : ""}`}
                    >
                      <Check className={`h-4 w-4 shrink-0 text-primary ${selected ? "opacity-100" : "opacity-0"}`} />
                      <span className="min-w-0 flex-1 truncate">{repository.repo}</span>
                      {repository.private ? <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Private repository" /> : null}
                    </button>
                  );
                })}
              </div>
            )) : (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground">No repositories found</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
