"use client";

import { useEffect, useState } from "react";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage indisponível (modo privado, etc.) — segue sem persistir.
  }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Lê o estado real do DOM (definido por ThemeScript antes da 1a pintura) após a
    // hidratação, para não divergir da renderização inicial do servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !isDark;
        setIsDark(next);
        applyTheme(next ? "dark" : "light");
      }}
      aria-pressed={isDark}
      title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface ${className}`}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
      <span className="sr-only">{isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}</span>
    </button>
  );
}
