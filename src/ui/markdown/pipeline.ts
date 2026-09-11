import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { defaultUrlTransform, type Options } from "react-markdown";

/**
 * Shared Markdown pipeline (ADR-017). Used by the view page and the editor preview
 * so there is no unsanitized preview path.
 *
 * GitHub-style allowlist from `rehype-sanitize` (no `javascript:` / `data:` in href/src).
 * Do not add `rehype-raw` here: raw HTML is dropped unless a later plugin opts in, and
 * the editor preview already sanitizes after its own HTML handling.
 */
export const markdownRemarkPlugins: NonNullable<Options["remarkPlugins"]> = [remarkGfm];

export const markdownRehypePlugins: NonNullable<Options["rehypePlugins"]> = [
  [rehypeSanitize, defaultSchema],
];

/** Blocks `javascript:`, `data:` and other unsafe protocols (react-markdown default). */
export const safeMarkdownUrlTransform = defaultUrlTransform;
