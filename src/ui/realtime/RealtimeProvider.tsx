"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { REMOTE_UPDATE_BANNER } from "@/ui/realtime/constants";
import { OpenEditProvider } from "@/ui/realtime/useProtectOpenEdit";
import { useRealtimeSse } from "@/ui/realtime/useRealtimeSse";

function RemoteUpdateBanner({ onReload }: { onReload: () => void }) {
  return (
    <div
      className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p>{REMOTE_UPDATE_BANNER}</p>
      <button
        type="button"
        onClick={onReload}
        className="mt-2 rounded-md px-2 py-1 font-medium underline hover:text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        Recarregar
      </button>
    </div>
  );
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dirtyIdsRef = useRef(new Set<string>());
  const pendingRefreshRef = useRef(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [reloadEpoch, setReloadEpoch] = useState(0);

  const flushIfClean = useCallback(() => {
    if (dirtyIdsRef.current.size > 0 || !pendingRefreshRef.current) {
      return;
    }
    pendingRefreshRef.current = false;
    setBannerVisible(false);
    router.refresh();
  }, [router]);

  const setDirty = useCallback(
    (id: string, dirty: boolean) => {
      if (dirty) {
        dirtyIdsRef.current.add(id);
      } else {
        dirtyIdsRef.current.delete(id);
      }
      flushIfClean();
    },
    [flushIfClean],
  );

  const registry = useMemo(() => ({ setDirty }), [setDirty]);

  useRealtimeSse({
    getFormDirty: () => dirtyIdsRef.current.size > 0,
    onRefresh: () => {
      pendingRefreshRef.current = false;
      setBannerVisible(false);
      router.refresh();
    },
    onDefer: () => {
      pendingRefreshRef.current = true;
      setBannerVisible(true);
    },
  });

  function reloadAnyway() {
    pendingRefreshRef.current = false;
    setBannerVisible(false);
    setReloadEpoch((epoch) => epoch + 1);
    router.refresh();
  }

  return (
    <OpenEditProvider registry={registry}>
      {bannerVisible ? <RemoteUpdateBanner onReload={reloadAnyway} /> : null}
      <div key={reloadEpoch}>{children}</div>
    </OpenEditProvider>
  );
}
