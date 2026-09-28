import { githubFileUrl } from "./file-paths";
import type { CommitInfo, FileContent, FileEntry } from "./repo-files";
import type { FilesTransport, FileWriteOptions, FileWriteResult } from "./transport";

interface Target {
  owner: string;
  repo: string;
}

async function apiCall<T>(target: Target, op: string, arguments_: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, op, ...arguments_ }),
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.error ?? "File operation failed"), { status: response.status });
  }
  return payload.result as T;
}

export function createServerFilesTransport(owner: string, repo: string): FilesTransport {
  const target = { owner, repo };
  return {
    cacheKey: `github:${owner}/${repo}`,
    listDir: (path) => apiCall<FileEntry[]>(target, "listDir", { path }),
    readFile: (path) => apiCall<FileContent | null>(target, "readFile", { path }),
    writeFile: (path, content, options?: FileWriteOptions) =>
      apiCall<FileWriteResult>(target, "writeFile", { path, content, expectedVersion: options?.expectedVersion }),
    deleteFile: (path, type) => apiCall<void>(target, "deleteFile", { path, type }),
    createFolder: (path) => apiCall<FileWriteResult>(target, "createFolder", { path }),
    async uploadFile(path, file) {
      const body = new FormData();
      body.set("owner", owner);
      body.set("repo", repo);
      body.set("path", path);
      body.set("file", file);
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error(payload.error ?? "Upload failed"), { status: response.status });
      }
      return payload.result as FileWriteResult;
    },
    movePath: (mutation) => apiCall<void>(target, "movePath", { mutation }),
    duplicatePath: (mutation) => apiCall<void>(target, "duplicatePath", { mutation }),
    externalUrl: (path, type) => githubFileUrl(owner, repo, path, type),
    search: (query) => apiCall<{ results: Array<{ path: string; snippet: string; lineInFragment: number | null; url: string }>; total: number }>(target, "search", { query }),
    history: (path, limit = 20) => apiCall<CommitInfo[]>(target, "history", { path, limit }),
    readVersion: (path, version) => apiCall<FileContent | null>(target, "readVersion", { path, version }),
  };
}
