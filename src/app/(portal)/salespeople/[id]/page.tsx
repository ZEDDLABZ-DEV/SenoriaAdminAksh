"use client";

import { useParams } from "next/navigation";
import { SalespersonScreen } from "@/components/sales-portal/salesperson-screen";
import { routeParam } from "@/lib/format";

export default function SalespersonPage() {
  const params = useParams<{ id: string }>();
  return <SalespersonScreen id={routeParam(params.id)} />;
}
