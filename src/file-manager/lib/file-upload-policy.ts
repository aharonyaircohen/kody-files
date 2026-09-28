export interface FileUploadPolicy {
  readonly allowedExtensions?: readonly string[];
  readonly allowedExtensionsLabel?: string;
  readonly maxBytes: number;
}

// Live browser uploads to GitHub passed at 30,000,000 bytes; 40,000,000
// failed. Keep the UI at the largest size verified end to end.
const GITHUB_BLOB_MAX_BYTES = 30_000_000;

export const DEFAULT_FILE_UPLOAD_POLICY: FileUploadPolicy = {
  maxBytes: GITHUB_BLOB_MAX_BYTES,
};

export const MARKDOWN_FILE_UPLOAD_POLICY: FileUploadPolicy = {
  allowedExtensions: [".md"],
  allowedExtensionsLabel: "Markdown",
  maxBytes: GITHUB_BLOB_MAX_BYTES,
};

export function uploadInputAccept(
  policy: FileUploadPolicy,
): string | undefined {
  return policy.allowedExtensions?.join(",");
}

export function validateUpload(
  file: Pick<File, "name" | "size">,
  policy: FileUploadPolicy,
  relativePath = file.name,
): string | null {
  const pathSegments = relativePath.replaceAll("\\", "/").split("/");
  if (
    relativePath.startsWith("/") ||
    pathSegments.some((segment) => segment === "." || segment === "..")
  ) {
    return "The upload path must stay inside this workspace.";
  }

  if (file.size > policy.maxBytes) {
    return `Files must be at most ${Math.floor(policy.maxBytes / 1_000_000)} MB.`;
  }

  if (policy.allowedExtensions?.length) {
    const lowerName = file.name.toLowerCase();
    const isAllowed = policy.allowedExtensions.some((extension) =>
      lowerName.endsWith(extension.toLowerCase()),
    );
    if (!isAllowed) {
      const label = policy.allowedExtensionsLabel ?? "Supported";
      return `Only ${label} files can be uploaded here.`;
    }
  }

  return null;
}
