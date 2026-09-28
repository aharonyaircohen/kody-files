import { writeGitHubFileWithRetry } from "@/shared/github/github-contents-write";
import { DEFAULT_FILE_UPLOAD_POLICY } from "@/file-manager/lib/file-upload-policy";
import type { FileWriteResult } from "@/file-manager/lib/transport";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not encode file for GitHub"));
        return;
      }
      const separator = result.indexOf(",");
      if (separator < 0 || !result.slice(0, separator).endsWith(";base64")) {
        reject(new Error("Could not encode file for GitHub"));
        return;
      }
      resolve(result.slice(separator + 1));
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onabort = () => reject(new Error("File reading was cancelled"));
    reader.readAsDataURL(file);
  });
}

/** Upload from the browser to GitHub, keeping file bytes out of Vercel Functions. */
export async function uploadDirectlyToGitHub(
  owner: string,
  repo: string,
  token: string,
  path: string,
  file: File,
): Promise<FileWriteResult> {
  if (file.size > DEFAULT_FILE_UPLOAD_POLICY.maxBytes) {
    throw new Error("File exceeds GitHub's 100 MB limit");
  }

  const [content, { Octokit }] = await Promise.all([
    readFileAsBase64(file),
    import("@octokit/rest"),
  ]);
  const octokit = new Octokit({ auth: token });
  const result = await writeGitHubFileWithRetry(octokit, {
    owner,
    repo,
    path,
    content,
    message: `chore: upload ${path}`,
  });
  return { version: result.sha ?? "" };
}
