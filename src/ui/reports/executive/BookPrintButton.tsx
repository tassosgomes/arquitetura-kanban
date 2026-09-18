"use client";

/**
 * Triggers the browser's print dialog. The page-break rules for
 * `.book-area-page` already live in globals.css — this is just the way to
 * reach them, so the Book can leave as a PDF.
 */
export function BookPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-container-lowest px-space-md py-2.5 text-label-md font-semibold text-primary shadow-sm hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        print
      </span>
      Imprimir / PDF
    </button>
  );
}
