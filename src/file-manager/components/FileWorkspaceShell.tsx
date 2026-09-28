import type { ReactNode } from "react";

interface FileWorkspaceShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Standalone visual frame for the File Manager workspace. */
export function FileWorkspaceShell({
  title,
  subtitle,
  actions,
  children,
}: FileWorkspaceShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 text-foreground md:px-7">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-heading-md font-semibold tracking-tight md:text-heading-lg">
            {title}
          </h1>
          {subtitle ? <span className="hidden truncate text-body-xs text-muted-foreground sm:inline">{subtitle}</span> : null}
        </div>
        {actions ? (
          <div className="flex min-w-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
