export type ProjectOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ProjectUserOption = {
  id: string;
  displayName: string | null;
  email: string | null;
  isActive: boolean;
};

export type ProjectFormValues = {
  id?: string;
  version?: number;
  name: string;
  description: string;
  responsibleAreaId: string;
  externalResponsible: string;
  architectureOwnerId: string;
  participantIds: string[];
  architectureRole: string;
  nature: string;
  startDate: string;
  expectedEndDate: string;
  status: string;
};

export function formatUserLabel(user: {
  displayName: string | null;
  email: string | null;
}): string {
  if (user.displayName && user.email) {
    return `${user.displayName} (${user.email})`;
  }
  return user.displayName ?? user.email ?? "Usuário sem identificação";
}

export function formatCivilDatePtBr(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export const CONTROL_CLASS_NAME =
  "w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md text-on-surface transition-colors focus:bg-surface-container-lowest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
