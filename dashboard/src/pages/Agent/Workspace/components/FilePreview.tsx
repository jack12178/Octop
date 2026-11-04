import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "../../../../components/Markdown/LazyMarkdown";
import styles from "../index.module.less";

/**
 * Rich preview kinds — documents that benefit from rendered view.
 * Source-code files (``.py`` / ``.js`` / ``.json`` / …) intentionally stay on
 * plain source mode: Prism/JSON-tree previews reflow heavily on panel resize.
 */
export type PreviewKind = "markdown" | "html";

export function getPreviewKind(path: string): PreviewKind | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "html" || ext === "htm") return "html";
  return null;
}

/** Whether the file should open in preview (vs source) by default. */
export function defaultPreviewMode(path: string): boolean {
  return getPreviewKind(path) !== null;
}

/** Preview kinds that need a flex-filled host (e.g. iframe) rather than scrollable text. */
export function previewNeedsFillLayout(kind: PreviewKind | null): boolean {
  return kind === "html";
}

function useDockResizing(elRef: RefObject<HTMLElement | null>): boolean {
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const panel = el.closest("[data-dock-panel]");
    if (!panel) return;
    const sync = () =>
      setResizing(panel.getAttribute("data-dock-resizing") === "1");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(panel, {
      attributes: true,
      attributeFilter: ["data-dock-resizing"],
    });
    return () => mo.disconnect();
  }, [elRef]);
  return resizing;
}

/**
 * During dock resize, freeze a DOM snapshot so markdown does not reflow (jank)
 * and the panel does not flash blank (unmount).
 */
function MarkdownPreview({ content }: { content: string }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);
  const freezeHtmlRef = useRef("");
  const heightRef = useRef(0);
  const [frozenHtml, setFrozenHtml] = useState<string | null>(null);
  const resizing = useDockResizing(wrapRef);

  useEffect(() => {
    if (resizing) {
      const live = liveRef.current;
      if (live && !frozenHtml) {
        heightRef.current = live.offsetHeight;
        freezeHtmlRef.current = live.innerHTML;
        setFrozenHtml(freezeHtmlRef.current);
      }
      return;
    }
    if (frozenHtml !== null) {
      setFrozenHtml(null);
    }
  }, [resizing, frozenHtml]);

  return (
    <div
      ref={wrapRef}
      className={styles.markdownPreviewHost}
      style={
        frozenHtml
          ? {
              minHeight: heightRef.current || undefined,
              overflow: "hidden",
              position: "relative",
            }
          : { position: "relative" }
      }
    >
      {frozenHtml ? (
        <div
          className={styles.markdownPreview}
          style={{ pointerEvents: "none" }}
          dangerouslySetInnerHTML={{ __html: frozenHtml }}
          aria-hidden
        />
      ) : (
        <div ref={liveRef}>
          <Markdown content={content} className={styles.markdownPreview} />
        </div>
      )}
    </div>
  );
}

/**
 * Render HTML from a blob URL instead of ``srcDoc``.
 *
 * A ``srcDoc`` document inherits the parent page as its base URL, so an
 * in-page anchor such as ``href="#summary"`` navigates the iframe to the Octop
 * app route. That replaces the artifact with the SPA shell, whose assets are
 * then blocked by CORS from the sandboxed frame's opaque origin (see #2623).
 * A blob URL gives the document its own URL, so fragment links stay in-document.
 * The sandbox still omits ``allow-same-origin``, so the origin stays opaque.
 */
function HtmlPreview({ content }: { content: string }) {
  const src = useMemo(
    () => URL.createObjectURL(new Blob([content], { type: "text/html" })),
    [content],
  );
  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  return (
    <iframe
      title="HTML preview"
      className={styles.htmlFrame}
      src={src}
      sandbox="allow-scripts allow-popups allow-forms"
    />
  );
}

export default function FilePreview({
  kind,
  content,
}: {
  kind: PreviewKind;
  content: string;
}) {
  switch (kind) {
    case "markdown":
      return <MarkdownPreview content={content} />;
    case "html":
      return <HtmlPreview content={content} />;
    default:
      return null;
  }
}
