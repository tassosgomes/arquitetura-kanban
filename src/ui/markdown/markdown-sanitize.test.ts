import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownView } from "@/ui/markdown/MarkdownView";

function html(markdown: string): string {
  return renderToStaticMarkup(createElement(MarkdownView, { markdown }));
}

describe("markdown sanitization (ADR-017)", () => {
  it("does not emit script tags from raw HTML", () => {
    const output = html('<script>alert(1)</script>\n\nTexto seguro');
    expect(output.toLowerCase()).not.toContain("<script");
    expect(output).toContain("Texto seguro");
  });

  it("does not keep onerror handlers from raw HTML", () => {
    const output = html('<img src="x" onerror="alert(1)">');
    expect(output.toLowerCase()).not.toContain("onerror");
    expect(output.toLowerCase()).not.toContain("alert(1)");
  });

  it("does not keep javascript: URLs", () => {
    const output = html(
      "[xss](javascript:alert(1))\n\n![x](javascript:alert(1))\n\n[ok](https://example.com)",
    );
    expect(output.toLowerCase()).not.toContain("javascript:");
    expect(output).toContain("https://example.com");
    expect(output).toContain("ok");
  });

  it("renders GFM tables and headings", () => {
    const output = html("# Título\n\n| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(output).toContain("<h1>");
    expect(output).toContain("Título");
    expect(output).toContain("<table>");
  });
});
