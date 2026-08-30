"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

// App-wide error boundary (Next.js convention) - catches any otherwise-unhandled exception
// thrown while rendering a page/layout (e.g. a DB error) and shows a real Hebrew fallback
// instead of Next's default unstyled error screen. Must be a Client Component.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app/error] unhandled error", error);
  }, [error]);

  return <ErrorState onRetry={reset} />;
}
