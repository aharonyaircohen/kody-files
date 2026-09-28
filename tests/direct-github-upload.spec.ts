import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadDirectlyToGitHub } from "@/app/files/direct-github-upload";

const github = vi.hoisted(() => ({
  auth: vi.fn(),
  createBlob: vi.fn(),
  getRepo: vi.fn(),
  getRef: vi.fn(),
  getCommit: vi.fn(),
  createTree: vi.fn(),
  createCommit: vi.fn(),
  updateRef: vi.fn(),
}));

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    rest = {
      repos: { get: github.getRepo },
      git: {
        createBlob: github.createBlob,
        getRef: github.getRef,
        getCommit: github.getCommit,
        createTree: github.createTree,
        createCommit: github.createCommit,
        updateRef: github.updateRef,
      },
    };
    git = this.rest.git;
    repos = this.rest.repos;
    constructor(options: { auth: string }) { github.auth(options.auth); }
  },
}));

class TestFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  readAsDataURL() {
    this.result = "data:application/octet-stream;base64,AP8=";
    this.onload?.();
  }
}

describe("direct GitHub upload", () => {
  beforeEach(() => {
    for (const method of Object.values(github)) method.mockReset();
    github.createBlob.mockResolvedValue({ data: { sha: "blob-sha" } });
    github.getRepo.mockResolvedValue({ data: { default_branch: "main" } });
    github.getRef.mockResolvedValue({ data: { object: { sha: "head-sha" } } });
    github.getCommit.mockResolvedValue({ data: { tree: { sha: "tree-sha" } } });
    github.createTree.mockResolvedValue({ data: { sha: "new-tree-sha" } });
    github.createCommit.mockResolvedValue({ data: { sha: "new-commit-sha" } });
    github.updateRef.mockResolvedValue({});
    vi.stubGlobal("FileReader", TestFileReader);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("commits a binary blob on the repository default branch", async () => {
    const result = await uploadDirectlyToGitHub(
      "octocat", "hello-world", "test-token", "assets/picture.bin", new File([new Uint8Array([0, 255])], "picture.bin"),
    );

    expect(github.auth).toHaveBeenCalledWith("test-token");
    expect(github.createBlob).toHaveBeenCalledWith({ owner: "octocat", repo: "hello-world", content: "AP8=", encoding: "base64" });
    expect(github.getRepo).toHaveBeenCalledWith({ owner: "octocat", repo: "hello-world" });
    expect(github.createTree).toHaveBeenCalledWith({
      owner: "octocat", repo: "hello-world", base_tree: "tree-sha",
      tree: [{ path: "assets/picture.bin", mode: "100644", type: "blob", sha: "blob-sha" }],
    });
    expect(github.createCommit).toHaveBeenCalledWith({
      owner: "octocat", repo: "hello-world", message: "chore: upload assets/picture.bin",
      tree: "new-tree-sha", parents: ["head-sha"],
    });
    expect(github.updateRef).toHaveBeenCalledWith({
      owner: "octocat", repo: "hello-world", ref: "heads/main", sha: "new-commit-sha", force: false,
    });
    expect(result).toEqual({ version: "blob-sha" });
  });

  it("rebuilds the tree when the branch advances before the update", async () => {
    github.updateRef
      .mockRejectedValueOnce({ status: 422, message: "Update is not a fast forward" })
      .mockResolvedValueOnce({});
    github.getRef
      .mockResolvedValueOnce({ data: { object: { sha: "head-sha" } } })
      .mockResolvedValueOnce({ data: { object: { sha: "new-head-sha" } } });

    await uploadDirectlyToGitHub(
      "octocat", "hello-world", "test-token", "picture.bin", new File(["x"], "picture.bin"),
    );

    expect(github.createBlob).toHaveBeenCalledTimes(1);
    expect(github.createTree).toHaveBeenCalledTimes(2);
    expect(github.createCommit).toHaveBeenNthCalledWith(2, expect.objectContaining({ parents: ["new-head-sha"] }));
    expect(github.updateRef).toHaveBeenCalledTimes(2);
  });

  it("rejects files over the repository limit before reading them", async () => {
    await expect(uploadDirectlyToGitHub(
      "octocat", "hello-world", "test-token", "oversize.bin",
      { size: 30_000_001 } as File,
    )).rejects.toThrow("30 MB upload limit");
    expect(github.createBlob).not.toHaveBeenCalled();
  });
});
