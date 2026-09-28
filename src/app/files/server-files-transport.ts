import { githubFileUrl } from "@/file-manager/lib/file-paths";
import type { CommitInfo, FileContent, FileEntry } from "@/file-manager/lib/repo-files";
import type { FilesTransport, FileWriteOptions, FileWriteResult } from "@/file-manager/lib/transport";
import { uploadDirectlyToGitHub } from "./direct-github-upload";

interface Target {
  owner: string;
  repo: string;
}

async function apiCall<T>(target: Target, token: string, op: string, arguments_: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...target, op, ...arguments_ }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.error ?? "File operation failed"), { status: response.status });
  }
  return payload.result as T;
}

export function createServerFilesTransport(owner: string, repo: string, token: string): FilesTransport {
  const target = { owner, repo };
  return {
    cacheKey: `github:${owner}/${repo}`,
    listDir: (path) => apiCall<FileEntry[]>(target, token, "listDir", { path }),
    readFile: (path) => apiCall<FileContent | null>(target, token, "readFile", { path }),
    writeFile: (path, content, options?: FileWriteOptions) =>
      apiCall<FileWriteResult>(target, token, "writeFile", { path, content, expectedVersion: options?.expectedVersion }),
    deleteFile: (path, type) => apiCall<void>(target, token, "deleteFile", { path, type }),
    createFolder: (path) => apiCall<FileWriteResult>(target, token, "createFolder", { path }),
    uploadFile: (path, file) => uploadDirectlyToGitHub(owner, repo, token, path, file),
    movePath: (mutation) => apiCall<void>(target, token, "movePath", { mutation }),
    duplicatePath: (mutation) => apiCall<void>(target, token, "duplicatePath", { mutation }),
    externalUrl: (path, type) => githubFileUrl(owner, repo, path, type),
    search: (query) => apiCall<{ results: Array<{ path: string; snippet: string; lineInFragment: number | null; url: string }>; total: number }>(target, token, "search", { query }),
    history: (path, limit = 20) => apiCall<CommitInfo[]>(target, token, "history", { path, limit }),
    readVersion: (path, version) => apiCall<FileContent | null>(target, token, "readVersion", { path, version }),
  };
}
