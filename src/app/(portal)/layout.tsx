"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { Shell } from "@/components/shell";
import { ToastProvider } from "@/components/toast";
import { StateBlock } from "@/components/ui";
import { hasSession } from "@/lib/api/session";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready } = useAuth();
  const signedIn = ready && hasSession();

  useEffect(() => {
    if (ready && !hasSession()) router.replace("/login");
  }, [ready, router]);

  if (!ready || !signedIn) {
    return (
      <div className="px-6 py-16">
        <StateBlock title="Checking your session" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <Shell>{children}</Shell>
    </ToastProvider>
  );
}
