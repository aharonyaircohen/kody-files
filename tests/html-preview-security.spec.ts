import { describe, expect, it } from "vitest";
import {
  FILE_HTML_PREVIEW_CSP,
  FILE_HTML_PREVIEW_SANDBOX,
} from "@/file-manager/lib/html-preview-security";

describe("HTML file preview isolation", () => {
  it("sandboxes scripts and blocks forms and frames", () => {
    expect(FILE_HTML_PREVIEW_SANDBOX).toBe("allow-scripts");
    expect(FILE_HTML_PREVIEW_CSP).toContain("form-action 'none'");
    expect(FILE_HTML_PREVIEW_CSP).toContain("frame-src 'none'");
  });

  it("does not grant repository file previews host permissions", () => {
    for (const permission of [
      "allow-same-origin",
      "allow-top-navigation",
      "allow-forms",
      "allow-popups",
      "allow-downloads",
    ]) {
      expect(FILE_HTML_PREVIEW_SANDBOX).not.toContain(permission);
    }
  });
});
