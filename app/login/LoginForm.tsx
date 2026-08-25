"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button, Card, Input } from "@/components/ui";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import styles from "./login.module.css";

export default function LoginForm() {
  const router = useRouter();
  const entranceProps = useEntranceMotion();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
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
      <Link href="/" className={styles.logoLink}>
        ניצוץ
      </Link>
      <Card as={motion.div} className={styles.card} {...entranceProps}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>התחברות</h2>

          <Input
            label="שם"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="סיסמה"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "מתחבר/ת..." : "התחברות"}
          </Button>

          <p className={styles.linkRow}>
            אין לך חשבון? <Link href="/onboarding">להרשמה</Link>
          </p>
          <p className={styles.linkRow}>
            <Link href="/forgot-password">שכחת סיסמה?</Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
