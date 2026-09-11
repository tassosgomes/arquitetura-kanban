"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

type OpenEditRegistry = {
  setDirty: (id: string, dirty: boolean) => void;
};

const OpenEditContext = createContext<OpenEditRegistry>({
  setDirty: () => undefined,
});

export function OpenEditProvider({
  registry,
  children,
}: {
  registry: OpenEditRegistry;
  children: ReactNode;
}) {
  return <OpenEditContext value={registry}>{children}</OpenEditContext>;
}

/** Registers an in-progress edit so SSE will not `router.refresh()` blindly. */
export function useProtectOpenEdit(isDirty: boolean): void {
  const id = useId();
  const { setDirty } = useContext(OpenEditContext);

  useEffect(() => {
    setDirty(id, isDirty);
    return () => setDirty(id, false);
  }, [id, isDirty, setDirty]);
}

export function useMarkFormDirty(): {
  markDirty: () => void;
  formProps: { onInput: () => void; onChange: () => void };
} {
  const [dirty, setDirty] = useState(false);
  const markDirty = useCallback(() => setDirty(true), []);
  useProtectOpenEdit(dirty);
  return {
    markDirty,
    formProps: { onInput: markDirty, onChange: markDirty },
  };
}
