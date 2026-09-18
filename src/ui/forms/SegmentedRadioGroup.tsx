"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export type SegmentedRadioOption = {
  value: string;
  label: ReactNode;
};

type SegmentedRadioGroupProps = {
  id: string;
  name: string;
  options: readonly SegmentedRadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-label": string;
};

export function SegmentedRadioGroup({
  id,
  name,
  options,
  value,
  defaultValue = "",
  onChange,
  required = false,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid = false,
  "aria-label": ariaLabel,
}: SegmentedRadioGroupProps) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedValue = isControlled ? value : uncontrolledValue;

  function handleChange(nextValue: string) {
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onChange?.(nextValue);
  }

  return (
    <div
      id={`${id}-group`}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid || undefined}
      aria-required={required || undefined}
      className={`flex flex-wrap gap-1.5 rounded-lg border p-1 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
        ariaInvalid
          ? "border-error bg-error-container/10"
          : "border-outline-variant bg-surface-container-low"
      }`}
    >
      {selectedValue === "" && !options.some((option) => option.value === "") ? (
        <input type="hidden" name={name} value="" />
      ) : null}
      {options.map((option, index) => {
        const optionId = index === 0 ? id : `${id}-${index}`;

        return (
          <label
            key={`${option.value}-${index}`}
            htmlFor={optionId}
            className="flex min-h-11 min-w-[6rem] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-center text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <input
              id={optionId}
              type="radio"
              name={name}
              value={option.value}
              checked={selectedValue === option.value}
              required={required && index === 0}
              onChange={(event) => handleChange(event.target.value)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-outline text-[10px] font-bold leading-none text-transparent transition-colors peer-checked:border-on-primary peer-checked:bg-on-primary peer-checked:text-primary-container"
            >
              ✓
            </span>
            <span className="rounded-md border border-transparent px-2 py-2 peer-checked:border-primary peer-checked:bg-primary-container peer-checked:font-semibold peer-checked:text-on-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[-2px] peer-focus-visible:outline-primary">
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
