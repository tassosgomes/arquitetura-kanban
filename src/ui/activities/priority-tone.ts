import { Priority } from "@/domain/catalog/classifications";

export const PRIORITY_TONE: Record<Priority, string> = {
  [Priority.LOW]: "bg-surface-container-high text-on-surface-variant",
  [Priority.MEDIUM]: "bg-surface-container-high text-on-surface-variant",
  [Priority.HIGH]: "border border-error/50 bg-error-container text-on-error-container",
  [Priority.CRITICAL]: "border border-error bg-error text-on-error",
};
