"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";
import { parseJsonResponse } from "@/lib/parseJsonResponse";
import styles from "./DeleteAccountButton.module.css";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeModal() {
    if (deleting) return;
    setOpen(false);
    setError(null);
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/delete-account", { method: "POST" });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "שגיאה במחיקת החשבון");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת החשבון");
      setDeleting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        מחיקת חשבון
      </Button>

      <Modal open={open} onClose={closeModal} title="מחיקת חשבון לצמיתות">
        <p className={styles.modalText}>הפעולה בלתי הפיכה, ותמחק לצמיתות מהמסד נתונים:</p>
        <ul className={styles.deleteList}>
          <li>פרופיל היוצר שלך (פרטי התחברות, מגזר, נישה, טון דיבור והעדפות)</li>
          <li>היסטוריית כל הרעיונות שנוצרו עבורך, כולל סימוני &quot;השתמשתי בזה&quot; / &quot;לא בשבילי&quot;</li>
          <li>נתוני שימוש ב-API ולוג הודעות הוואטסאפ שנשלחו אליך</li>
        </ul>
        <p className={styles.modalText}>לא ניתן לשחזר את המידע לאחר המחיקה.</p>

        {error && (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        )}

        <div className={styles.modalActions}>
          <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? "מוחק..." : "כן, מחקי לצמיתות"}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={closeModal} disabled={deleting}>
            ביטול
          </Button>
        </div>
      </Modal>
    </>
  );
}
