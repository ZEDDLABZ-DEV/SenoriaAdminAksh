"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasSession } from "@/lib/api/session";
import { StateBlock } from "@/components/ui";

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(hasSession() ? "/home" : "/login");
  }, [router]);
  return <StateBlock title="Opening Senoria" />;
}
