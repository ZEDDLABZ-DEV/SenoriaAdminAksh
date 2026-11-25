"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { IntegrationsProvider } from "@/components/sales-portal/integrations-provider";
import { Shell } from "@/components/shell";
import { ToastProvider } from "@/components/toast";
import { StateBlock } from "@/components/ui";
import { hasSession, isSalesRole } from "@/lib/api/session";
import { isSalesAllowedPath } from "@/lib/sales-portal";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, user } = useAuth();
  const signedIn = ready && hasSession();
  const sales = signedIn && isSalesRole(user?.role);
  const onProfile = pathname === "/profile";
  const held = signedIn && ((sales && !isSalesAllowedPath(pathname)) || (!sales && onProfile));

  useEffect(() => {
    if (!ready) return;
    if (!hasSession()) {
      router.replace("/login");
      return;
    }
    if (isSalesRole(user?.role) && !isSalesAllowedPath(pathname)) {
      router.replace("/today");
      return;
    }
    if (!isSalesRole(user?.role) && pathname === "/profile") {
      router.replace("/home");
    }
  }, [ready, router, user?.role, pathname]);

  const gateTitle = !ready || !signedIn ? "Checking your session" : sales ? "Opening your day" : "Opening home";

  if (!ready || !signedIn || held) {
    return (
      <div className="px-6 py-16">
        <StateBlock title={gateTitle} />
      </div>
    );
  }

  return (
    <ToastProvider>
      <IntegrationsProvider>
        <Shell>{children}</Shell>
      </IntegrationsProvider>
    </ToastProvider>
  );
}
