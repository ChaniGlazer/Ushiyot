import { db } from "./db";

/**
 * Appends a permanent fact to the creator's profile (e.g. "לבת שלי קוראים נועה"),
 * rather than replacing it, so multiple remembered details accumulate over time.
 * Editing/removing a single past entry is intentionally out of scope for now.
 *
 * Kept out of lib/creators.ts on purpose: that module is also imported by client
 * components (e.g. OnboardingForm) for its constants/types, and pulling in `db`
 * (node:sqlite) there would break the client bundle.
 */
export function appendPersistentContext(creatorId: number, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const row = db.prepare("SELECT persistent_context FROM creators WHERE id = ?").get(creatorId) as
    | { persistent_context: string | null }
    | undefined;

  const existing = row?.persistent_context?.trim();
  const updated = existing ? `${existing}\n${trimmed}` : trimmed;

  db.prepare("UPDATE creators SET persistent_context = ? WHERE id = ?").run(updated, creatorId);
}
