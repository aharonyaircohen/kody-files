import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadDirectlyToGitHub } from "@/app/files/direct-github-upload";

const github = vi.hoisted(() => ({
  write: vi.fn(),
  read: vi.fn(),
  auth: vi.fn(),
}));

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    rest = { repos: {
      createOrUpdateFileContents: github.write,
      getContent: github.read,
    } };
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
    github.write.mockReset();
    github.read.mockReset();
    github.auth.mockReset();
    vi.stubGlobal("FileReader", TestFileReader);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("writes encoded bytes with the user's token", async () => {
    github.write.mockResolvedValue({ data: { content: { sha: "new-sha" }, commit: { sha: "commit" } } });

    const result = await uploadDirectlyToGitHub(
      "octocat", "hello-world", "test-token", "assets/picture.bin", new File([new Uint8Array([0, 255])], "picture.bin"),
    );

    expect(github.auth).toHaveBeenCalledWith("test-token");
    expect(github.write).toHaveBeenCalledWith({
      owner: "octocat",
      repo: "hello-world",
      path: "assets/picture.bin",
      message: "chore: upload assets/picture.bin",
      content: "AP8=",
    });
    expect(github.read).not.toHaveBeenCalled();
    expect(result).toEqual({ version: "new-sha" });
  });

  it("retries an existing path with its current SHA", async () => {
    github.write
      .mockRejectedValueOnce({ status: 422, message: "sha wasn't supplied" })
      .mockResolvedValueOnce({ data: { content: { sha: "updated-sha" } } });
    github.read.mockResolvedValue({ data: { sha: "old-sha" } });

    const result = await uploadDirectlyToGitHub(
      "octocat", "hello-world", "test-token", "picture.bin", new File(["x"], "picture.bin"),
    );

    expect(github.read).toHaveBeenCalledWith({ owner: "octocat", repo: "hello-world", path: "picture.bin" });
    expect(github.write).toHaveBeenNthCalledWith(2, expect.objectContaining({ sha: "old-sha" }));
    expect(result).toEqual({ version: "updated-sha" });
  });

  it("rejects files over the repository limit before reading them", async () => {
    await expect(uploadDirectlyToGitHub(
      "octocat", "hello-world", "test-token", "oversize.bin",
      { size: 100 * 1024 * 1024 + 1 } as File,
    )).rejects.toThrow("100 MB limit");
    expect(github.write).not.toHaveBeenCalled();
  });
});
