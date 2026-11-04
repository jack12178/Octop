import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FilePreview from "./FilePreview";

const BLOB_URL = "blob:http://localhost/preview-1";
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

describe("FilePreview HTML (#2623)", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => BLOB_URL),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreate,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevoke,
    });
    vi.restoreAllMocks();
  });

  it("uses a blob URL instead of srcDoc so fragment links stay in-document", () => {
    const html = '<a href="#summary">Summary</a><section id="summary">Hi</section>';
    const { unmount } = render(<FilePreview kind="html" content={html} />);

    const frame = screen.getByTitle("HTML preview") as HTMLIFrameElement;
    expect(frame.getAttribute("srcdoc")).toBeNull();
    expect(frame.getAttribute("src")).toBe(BLOB_URL);
    expect(frame.getAttribute("sandbox")).toBe(
      "allow-scripts allow-popups allow-forms",
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(BLOB_URL);
  });
});
