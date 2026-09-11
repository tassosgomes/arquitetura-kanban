import type { ReactNode } from "react";
import { FieldError } from "@/ui/forms/FieldError";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
  children: ReactNode;
};

/**
 * Padrão de campo de formulário: label associado, descrição opcional, controle
 * filho e `FieldError` abaixo do controle quando `error` estiver definido.
 *
 * @example
 * <FormField id="nome" label="Nome" error={errors.nome} required>
 *   <input
 *     id="nome"
 *     name="nome"
 *     aria-invalid={Boolean(errors.nome)}
 *     aria-describedby={errors.nome ? "nome-error" : undefined}
 *   />
 * </FormField>
 */
export function FormField({
  id,
  label,
  error,
  required = false,
  description,
  children,
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md font-semibold text-on-surface">
        {label}
        {required ? (
          <span className="text-error" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (obrigatório)</span> : null}
      </label>
      {description ? (
        <p id={descriptionId} className="text-body-sm text-on-surface-variant">
          {description}
        </p>
      ) : null}
      {children}
      <FieldError id={error ? errorId : undefined} message={error} />
    </div>
  );
}
