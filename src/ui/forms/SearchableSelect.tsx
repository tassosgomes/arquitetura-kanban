"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

export type SearchableSelectOption = {
  id: string;
  label: string;
  searchText?: string;
  isActive: boolean;
};

type SearchableSelectProps = {
  id: string;
  name: string;
  options: readonly SearchableSelectOption[];
  selectedIds: readonly string[];
  onSelectionChange: (selectedIds: string[]) => void;
  selectionLabel: string;
  selectionNoun: string;
  selectionNounPlural: string;
  emptySelectionMessage: string;
  placeholder: string;
  noOptionsMessage?: string;
  noMatchesMessage?: string;
  multiple?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-labelledby"?: string;
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function filterSearchableOptions(
  options: readonly SearchableSelectOption[],
  query: string,
  selectedIds: readonly string[],
): SearchableSelectOption[] {
  const selected = new Set(selectedIds);
  const normalizedQuery = normalizeSearchText(query.trim());
  const seen = new Set<string>();

  return options.filter((option) => {
    if (seen.has(option.id)) {
      return false;
    }
    seen.add(option.id);

    if (!option.isActive || selected.has(option.id)) {
      return false;
    }

    const searchableText = normalizeSearchText(`${option.label} ${option.searchText ?? ""}`);
    return normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);
  });
}

function getSelectionCountMessage(
  count: number,
  selectionNoun: string,
  selectionNounPlural: string,
  emptySelectionMessage: string,
): string {
  if (count === 0) {
    return emptySelectionMessage;
  }

  return `${count} ${count === 1 ? selectionNoun : selectionNounPlural} selecionado${count === 1 ? "" : "s"}`;
}

export function SearchableSelect({
  id,
  name,
  options,
  selectedIds,
  onSelectionChange,
  selectionLabel,
  selectionNoun,
  selectionNounPlural,
  emptySelectionMessage,
  placeholder,
  noOptionsMessage = "Nenhuma opção disponível.",
  noMatchesMessage = "Nenhuma opção encontrada.",
  multiple = false,
  required = false,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid = false,
  "aria-labelledby": ariaLabelledBy,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState("");

  const filteredOptions = useMemo(
    () => filterSearchableOptions(options, query, selectedIds),
    [options, query, selectedIds],
  );
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const selectedOptions = selectedIds.map(
    (selectedId) =>
      optionById.get(selectedId) ?? {
        id: selectedId,
        label: selectedId,
        isActive: false,
      },
  );
  const listboxId = `${id}-listbox`;
  const selectionCountMessage = getSelectionCountMessage(
    selectedIds.length,
    selectionNoun,
    selectionNounPlural,
    emptySelectionMessage,
  );
  const activeOptionId =
    open && activeIndex >= 0 && activeIndex < filteredOptions.length
      ? `${id}-option-${activeIndex}`
      : undefined;

  function announce(message: string) {
    setAnnouncement(message);
  }

  function selectOption(option: SearchableSelectOption) {
    const nextSelectedIds = multiple ? [...selectedIds, option.id] : [option.id];
    onSelectionChange(nextSelectedIds);
    setQuery("");
    setActiveIndex(-1);
    setAnnouncement(`${option.label} selecionado.`);
    inputRef.current?.focus();

    if (!multiple) {
      setOpen(false);
    }
  }

  function removeSelection(selectedId: string) {
    const option = optionById.get(selectedId);
    const nextSelectedIds = selectedIds.filter((idValue) => idValue !== selectedId);
    onSelectionChange(nextSelectedIds);
    announce(`${option?.label ?? selectedId} removido.`);
    inputRef.current?.focus();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (filteredOptions.length === 0) {
        return;
      }

      event.preventDefault();
      setOpen(true);
      setActiveIndex((currentIndex) => {
        if (currentIndex < 0) {
          return event.key === "ArrowDown" ? 0 : filteredOptions.length - 1;
        }

        const increment = event.key === "ArrowDown" ? 1 : -1;
        return (currentIndex + increment + filteredOptions.length) % filteredOptions.length;
      });
      return;
    }

    if (event.key === "Enter") {
      if (filteredOptions.length === 0) {
        return;
      }

      event.preventDefault();
      if (!open && filteredOptions.length > 1) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }

      const optionIndex = activeIndex >= 0 ? activeIndex : 0;
      const option = filteredOptions[optionIndex];
      if (option) {
        selectOption(option);
      }
      return;
    }

    if (event.key === "Escape") {
      if (!open) {
        return;
      }

      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      query.length === 0 &&
      selectedIds.length > 0
    ) {
      event.preventDefault();
      removeSelection(selectedIds[selectedIds.length - 1]);
    }
  }

  function handleRootBlur() {
    window.setTimeout(() => {
      if (rootRef.current && !rootRef.current.contains(document.activeElement)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }, 0);
  }

  return (
    <div ref={rootRef} className="relative" onBlur={handleRootBlur}>
      {selectedIds.map((selectedId) => (
        <input key={selectedId} type="hidden" name={name} value={selectedId} />
      ))}

      <div
        className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-surface-container-low px-2 py-1.5 transition-colors focus-within:bg-surface-container-lowest focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
          ariaInvalid ? "border-error" : "border-outline-variant"
        }`}
      >
        {selectedOptions.map((option) => {
          const isUnavailable = !option.isActive;
          const statusLabel = isUnavailable ? " (inativo)" : "";

          return (
            <button
              key={option.id}
              type="button"
              aria-label={`Remover ${option.label}${statusLabel}`}
              onClick={() => removeSelection(option.id)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" || event.key === "Delete") {
                  event.preventDefault();
                  removeSelection(option.id);
                }
              }}
              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-label-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isUnavailable
                  ? "border-error/50 bg-error-container/20 text-on-surface"
                  : "border-primary/30 bg-primary/10 text-on-surface"
              }`}
            >
              <span className="max-w-[18rem] truncate">
                {option.label}
                {statusLabel}
              </span>
              <span aria-hidden="true" className="text-base leading-none">
                ×
              </span>
            </button>
          );
        })}

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-activedescendant={activeOptionId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-labelledby={ariaLabelledBy}
          aria-required={required}
          autoComplete="off"
          placeholder={placeholder}
          spellCheck={false}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant"
        />
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`Opções de ${selectionLabel}`}
          aria-multiselectable={multiple || undefined}
          className="absolute inset-x-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-1 shadow-lg"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.id}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={false}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={`flex w-full items-center rounded-md px-2.5 py-2 text-left text-body-sm text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                  activeIndex === index ? "bg-surface-container-high" : "hover:bg-surface-container"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-2.5 py-2 text-body-sm text-on-surface-variant">
              {options.some((option) => option.isActive)
                ? noMatchesMessage
                : noOptionsMessage}
            </p>
          )}
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement ? `${announcement} ${selectionCountMessage}` : selectionCountMessage}
      </p>
    </div>
  );
}
