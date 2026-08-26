"use client";

import Link from "next/link";
import { Button } from "@/components/ui";

// A dedicated client wrapper (matching LogoutButton/DeleteAccountButton) rather than inlining
// <Button as={Link}> directly in the dashboard's Server Component page: passing `Link` (a
// function) as a prop from a Server Component to a Client Component isn't serializable and
// throws at render time - Button itself only works this way from within a "use client" module.
export default function SettingsLink() {
  return (
    <Button as={Link} href="/settings" variant="ghost" size="sm">
      ⚙ הגדרות
    </Button>
  );
}
