"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

// Dashboard-specific error boundary - takes priority over app/error.tsx for anything thrown
// while rendering /dashboard (its Server Component does several DB/Hebcal reads - see
// app/dashboard/page.tsx), so a failure there shows a targeted message instead of the generic
// app-wide one.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard/error] unhandled error rendering the dashboard", error);
  }, [error]);

  return (
    <ErrorState
      title="לא הצלחנו לטעון את הדשבורד"
      message="קרתה שגיאה בטעינת הנתונים שלך. אפשר לנסות שוב - אם זה ממשיך לקרות, כדאי לנסות שוב בעוד כמה דקות."
      onRetry={reset}
    />
  );
}
