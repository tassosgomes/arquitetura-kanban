"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

const ACTIVITY_FORM_SAVED_EVENT = "activity-form-saved";
const ACTIVITY_PANEL_ID = "activity-create-panel";
const DISCARD_CONFIRMATION =
  "Há alterações não salvas. Deseja descartar o formulário?";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable=\"true\"]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

type ActivityModalProps = {
  children: ReactNode;
  href?: string;
  initiallyOpen?: boolean;
  triggerLabel?: string;
  triggerIcon?: string;
  triggerClassName?: string;
};

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

function focusPanel(panel: HTMLElement | null): void {
  if (!panel) {
    return;
  }
  const firstFocusable = focusableElements(panel)[0];
  firstFocusable?.focus({ preventScroll: true });
}

export function ActivityModal({
  children,
  href,
  initiallyOpen = false,
  triggerLabel = "Nova atividade",
  triggerIcon = "add_circle",
  triggerClassName,
}: ActivityModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);
  const [dirty, setDirty] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    function markSaved() {
      setDirty(false);
    }

    window.addEventListener(ACTIVITY_FORM_SAVED_EVENT, markSaved);
    return () => window.removeEventListener(ACTIVITY_FORM_SAVED_EVENT, markSaved);
  }, []);

  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    const activeElement = document.activeElement;
    originRef.current = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : null;

    const background =
      document.querySelector<HTMLElement>("[data-kanban-background]") ??
      document.querySelector<HTMLElement>("#conteudo-principal");
    const previousAriaHidden = background?.getAttribute("aria-hidden") ?? null;
    const previousInert = background?.hasAttribute("inert") ?? false;
    const previousBodyOverflow = document.body.style.overflow;

    if (background) {
      background.setAttribute("aria-hidden", "true");
      background.setAttribute("inert", "");
    }
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      if (background) {
        if (previousAriaHidden === null) {
          background.removeAttribute("aria-hidden");
        } else {
          background.setAttribute("aria-hidden", previousAriaHidden);
        }
        if (!previousInert) {
          background.removeAttribute("inert");
        }
      }
      document.body.style.overflow = previousBodyOverflow;

      const origin = originRef.current;
      if (origin?.isConnected) {
        window.requestAnimationFrame(() => origin.focus({ preventScroll: true }));
      }
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePopState() {
      if (window.location.pathname === "/activities/new") {
        return;
      }

      if (closingRef.current) {
        closingRef.current = false;
        setOpen(false);
        return;
      }

      if (dirty && !window.confirm(DISCARD_CONFIRMATION)) {
        window.history.forward();
        window.setTimeout(() => focusPanel(panelRef.current), 0);
        return;
      }

      setOpen(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [dirty, open]);

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm(DISCARD_CONFIRMATION)) {
      return;
    }

    closingRef.current = true;
    setOpen(false);
    router.back();
  }, [dirty, router]);

  function handleOpen(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setDirty(false);
    window.history.pushState(null, "", href);
    setOpen(true);
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = focusableElements(event.currentTarget);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handlePanelClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest("a");
    if (!link) {
      return;
    }

    const targetHref = link.getAttribute("href");
    if (!targetHref || targetHref.startsWith("#")) {
      return;
    }

    const targetUrl = new URL(targetHref, window.location.href);
    if (targetUrl.origin !== window.location.origin || targetUrl.pathname === "/activities/new") {
      if (dirty && targetUrl.origin !== window.location.origin) {
        if (!window.confirm(DISCARD_CONFIRMATION)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (dirty && !window.confirm(DISCARD_CONFIRMATION)) {
      return;
    }

    setDirty(false);
    setOpen(false);
    router.push(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
  }

  const modal = open ? (
    <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-slate-950/45 dark:bg-black/60"
        aria-hidden="true"
        onClick={requestClose}
      />
      <section
        ref={panelRef}
        id={ACTIVITY_PANEL_ID}
        role="dialog"
        aria-modal="true"
        aria-label="Nova atividade"
        className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-surface shadow-2xl md:w-[min(540px,100vw)]"
        onKeyDown={handlePanelKeyDown}
        onClickCapture={handlePanelClick}
        onInput={() => setDirty(true)}
        onChange={() => setDirty(true)}
      >
        <header className="flex shrink-0 items-start justify-between gap-space-md border-b border-outline-variant bg-surface-container-lowest px-space-md py-space-md lg:px-gutter-lg">
          <div>
            <h2 className="text-headline-md text-on-surface">Nova atividade</h2>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Cadastre a atividade sem perder o contexto atual.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            aria-label="Fechar painel de nova atividade"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
              close
            </span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  ) : null;

  return (
    <>
      {href ? (
        <a
          href={href}
          aria-haspopup="dialog"
          aria-controls={ACTIVITY_PANEL_ID}
          onClick={handleOpen}
          className={
            triggerClassName ??
            "inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-space-md py-2.5 text-label-md font-semibold text-on-primary shadow-md shadow-primary/20 transition-all hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          }
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {triggerIcon}
          </span>
          {triggerLabel}
        </a>
      ) : null}
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
