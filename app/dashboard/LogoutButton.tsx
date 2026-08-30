"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import styles from "./dashboard.module.css";

// Icon-only (no visible label) - title/aria-label carry the accessible name instead.
export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Network failure - the session cookie may not have been cleared server-side, but the
      // intent is still to leave the authenticated area, so navigate away regardless rather than
      // leaving the button stuck disabled with no way to retry.
    } finally {
      setLoggingOut(false);
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={loggingOut}
      className={styles.headerIconButton}
      title="התנתקות"
      aria-label={loggingOut ? "מתנתק/ת..." : "התנתקות"}
    >
      {loggingOut ? "…" : "⏻"}
    </Button>
  );
}
