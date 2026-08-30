"use client";

import { useState } from "react";
import { Button, Modal } from "@/components/ui";
import { parseJsonResponse } from "@/lib/parseJsonResponse";
import dashboardStyles from "./dashboard.module.css";
import styles from "./FeedbackButton.module.css";

const MAX_LENGTH = 2000;

// Lets a creator send free-text feedback straight to the admin (see app/admin/feedback and
// app/api/feedback) - a lightweight in-app channel instead of needing WhatsApp/email to reach
// her directly. Icon-only trigger (matching SettingsLink/LogoutButton) so it doesn't cost its
// own row in the header.
export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleClose() {
    setOpen(false);
    setMessage("");
    setStatus(null);
  }

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) {
      setStatus({ type: "error", text: "יש לכתוב הערה לפני השליחה" });
      return;
    }

    setSending(true);
    setStatus(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        setStatus({ type: "error", text: data.error ?? "משהו השתבש, נסו שוב" });
        return;
      }

      setMessage("");
      setStatus({ type: "success", text: "תודה! ההערה נשלחה." });
    } catch {
      setStatus({ type: "error", text: "שגיאת רשת, נסו שוב" });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={dashboardStyles.headerIconButton}
        title="הערה למנהלת המערכת"
        aria-label="הערה למנהלת המערכת"
      >
        💬
      </Button>

      <Modal open={open} onClose={handleClose} title="הערה למנהלת המערכת">
        <p className={styles.hint}>יש לכם רעיון, באג, או משהו שכדאי שנדע עליו? כתבו כאן - זה מגיע ישירות אלינו.</p>
        <textarea
          className={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_LENGTH}
          rows={5}
          placeholder="כתבו כאן את ההערה שלכם..."
          disabled={sending}
          aria-label="הערה למנהלת המערכת"
        />
        {status && (
          <p className={status.type === "error" ? styles.formError : styles.formSuccess} role="status">
            {status.text}
          </p>
        )}
        <div className={styles.actions}>
          <Button type="button" variant="primary" size="sm" onClick={handleSubmit} isLoading={sending}>
            {sending ? "שולח..." : "שליחה"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
