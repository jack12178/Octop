import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// CSS layering bugs cannot be observed through jsdom computed styles, so guard
// the two declarations that decide which element receives the pointer.
const source = readFileSync(
  fileURLToPath(new URL("./RailEdgeControl.module.less", import.meta.url)),
  "utf8",
);

describe("RailEdgeControl pointer events (#2506)", () => {
  it("lets the full-height edge pass pointer events through to the resize handle", () => {
    const edge = source.match(/\.edge\s*\{[^}]*\}/)?.[0] ?? "";
    expect(edge).toContain("pointer-events: none");
  });

  it("keeps the collapse/expand button as the only hit target", () => {
    const btn = source.match(/\.btn\s*\{[^}]*\}/)?.[0] ?? "";
    expect(btn).toContain("pointer-events: auto");
    expect(source).toContain(".btn:hover");
  });
});
