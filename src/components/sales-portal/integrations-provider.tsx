"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { describeApiError } from "@/lib/api/errors";
import { getIntegrationsStatus } from "@/lib/api/resources";
import { hasSession } from "@/lib/api/session";
import type { IntegrationsStatus } from "@/lib/api/types";
import { DISABLED_INTEGRATIONS } from "@/lib/integrations";
import { isSalesWorkspacePath } from "@/lib/sales-portal";

interface IntegrationsContextValue {
  status: IntegrationsStatus;
  loading: boolean;
  error: string;
  reload: () => void;
}

const IntegrationsContext = createContext<IntegrationsContextValue | null>(null);

const statusCache = new Map<string, { status: IntegrationsStatus; error: string }>();
let statusInflight: { userId: string; promise: Promise<{ status: IntegrationsStatus; error: string }> } | null = null;
let cacheGeneration = 0;

function readIntegrations(userId: string): Promise<{ status: IntegrationsStatus; error: string }> {
  const cached = statusCache.get(userId);
  if (cached) return Promise.resolve(cached);
  if (statusInflight?.userId === userId) return statusInflight.promise;
  const generation = cacheGeneration;
  const promise = getIntegrationsStatus()
    .then((status) => ({ status, error: "" }))
    .catch((caught: unknown) => ({ status: DISABLED_INTEGRATIONS, error: describeApiError(caught) }))
    .then((next) => {
      if (generation === cacheGeneration) statusCache.set(userId, next);
      return next;
    })
    .finally(() => {
      if (statusInflight?.promise === promise) statusInflight = null;
    });
  statusInflight = { userId, promise };
  return promise;
}

export function IntegrationsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const active = ready && hasSession() && isSalesWorkspacePath(pathname);
  const userId = user?.id ?? "";
  const [status, setStatus] = useState<IntegrationsStatus>(DISABLED_INTEGRATIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadedFor = useRef("");
  const requestId = useRef(0);

  const load = useCallback((nextUserId: string) => {
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    setError("");
    readIntegrations(nextUserId)
      .then((next) => {
        if (requestId.current !== id) return;
        loadedFor.current = nextUserId;
        setStatus(next.status);
        setError(next.error);
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!active || !userId || loadedFor.current === userId) return;
    load(userId);
  }, [active, userId, load]);

  const reload = useCallback(() => {
    if (!userId) return;
    cacheGeneration += 1;
    statusCache.delete(userId);
    statusInflight = null;
    loadedFor.current = "";
    load(userId);
  }, [load, userId]);

  return (
    <IntegrationsContext.Provider value={{ status, loading, error, reload }}>{children}</IntegrationsContext.Provider>
  );
}

export function useIntegrations(): IntegrationsContextValue {
  return (
    useContext(IntegrationsContext) ?? {
      status: DISABLED_INTEGRATIONS,
      loading: false,
      error: "",
      reload: () => {},
    }
  );
}
