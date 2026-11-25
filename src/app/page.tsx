"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getStoredUser, hasSession, portalHomePath } from "@/lib/api/session";
import { StateBlock } from "@/components/ui";

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(hasSession() ? portalHomePath(getStoredUser()?.role) : "/login");
  }, [router]);
  return <StateBlock title="Opening Senoria" />;
}
