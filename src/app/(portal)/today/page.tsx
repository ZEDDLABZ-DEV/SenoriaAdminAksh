import { Suspense } from "react";
import { TodayScreen } from "@/components/sales-portal/today-screen";
import { StateBlock } from "@/components/ui";

export default function TodayPage() {
  return (
    <Suspense fallback={<StateBlock title="Opening today" />}>
      <TodayScreen />
    </Suspense>
  );
}
