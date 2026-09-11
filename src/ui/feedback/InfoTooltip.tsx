"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type InfoTooltipProps = {
  label?: string;
  children: ReactNode;
  className?: string;
};

export function InfoTooltip({ label = "Como funciona", children, className = "" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          info
        </span>
        <span className="sr-only">{label}</span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(90vw,20rem)] rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-space-md text-body-sm leading-6 text-on-surface-variant shadow-lg sm:w-80"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
