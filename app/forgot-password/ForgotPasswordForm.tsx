"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import styles from "../login/login.module.css";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setError("הסיסמה החדשה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("הסיסמאות לא תואמות");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsappNumber, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("שגיאת רשת, נסו שוב");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>שחזור סיסמה</h2>

          <Input label="שם" type="text" value={name} onChange={(e) => setName(e.target.value)} required />

          <Input
            label="מספר וואטסאפ שנרשמת איתו"
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="050-1234567"
            required
          />

          <Input
            label="סיסמה חדשה"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="אימות סיסמה חדשה"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "מעדכן/ת..." : "עדכון סיסמה וכניסה"}
          </Button>

          <p className={styles.linkRow}>
            <Link href="/login">חזרה להתחברות</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
