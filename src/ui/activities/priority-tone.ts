import { Priority } from "@/domain/catalog/classifications";

export const PRIORITY_TONE: Record<Priority, string> = {
  [Priority.LOW]: "bg-surface-container-high text-on-surface-variant",
  [Priority.MEDIUM]: "bg-secondary-fixed text-on-secondary-fixed",
  [Priority.HIGH]: "bg-error-container text-on-error-container",
  [Priority.CRITICAL]: "bg-error text-on-error",
};
