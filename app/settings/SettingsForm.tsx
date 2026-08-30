"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, Card, Input, Select, Toggle } from "@/components/ui";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import { PLATFORMS, TONE_STYLES } from "@/lib/creators";
import { parseJsonResponse } from "@/lib/parseJsonResponse";
import DeleteAccountButton from "./DeleteAccountButton";
import styles from "./settings.module.css";

type SettingsState = {
  name: string;
  niche: string;
  targetAudience: string;
  platforms: string[];
  toneStyle: string;
  showParasha: boolean;
  whatsappNotificationsEnabled: boolean;
};

type Props = { initial: SettingsState };

export default function SettingsForm({ initial }: Props) {
  const [form, setForm] = useState<SettingsState>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const entranceProps = useEntranceMotion();

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(platform: string) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    // Only non-empty optional fields are sent - an empty niche/target audience/platforms/tone
    // means "leave it as it was", not "clear it" (same convention as the onboarding
    // questionnaire's PATCH /api/profile), so someone who only wants to flip one toggle isn't
    // forced to also have filled in every other field first.
    const payload: Record<string, unknown> = {
      name: form.name,
      showParasha: form.showParasha,
      whatsappNotificationsEnabled: form.whatsappNotificationsEnabled,
    };
    if (form.niche.trim()) payload.niche = form.niche.trim();
    if (form.targetAudience.trim()) payload.targetAudience = form.targetAudience.trim();
    if (form.platforms.length > 0) payload.platforms = form.platforms;
    if (form.toneStyle) payload.toneStyle = form.toneStyle;

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "משהו השתבש, נסו שוב" });
        return;
      }

      setMessage({ type: "success", text: "ההגדרות נשמרו ✓" });
    } catch {
      setMessage({ type: "error", text: "שגיאת רשת, נסו שוב" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link href="/dashboard" className={styles.logoLink}>
        ניצוץ
      </Link>
      <Card as={motion.div} className={styles.card} {...entranceProps}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>הגדרות</h1>
          <Link href="/dashboard" className={styles.backLink}>
            ← חזרה לדשבורד
          </Link>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>פרטים כלליים</h2>
          <Input label="שם תצוגה" type="text" value={form.name} onChange={(e) => update("name", e.target.value)} />
          <Input
            label="נישה (אופציונלי)"
            type="text"
            value={form.niche}
            onChange={(e) => update("niche", e.target.value)}
            placeholder="לדוגמה: כושר, פיננסים, הורות, נדל״ן..."
          />
          <Input
            label="קהל יעד (אופציונלי)"
            type="text"
            value={form.targetAudience}
            onChange={(e) => update("targetAudience", e.target.value)}
            placeholder="לדוגמה: אמהות צעירות, יזמים מתחילים, סטודנטים..."
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>תוכן</h2>
          <fieldset className={styles.fieldset}>
            <legend className={styles.fieldLabel}>באילו פלטפורמות את/ה פעיל/ה?</legend>
            <div className={styles.checkboxGrid}>
              {PLATFORMS.map((platform) => (
                <label key={platform} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={form.platforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                  />
                  <span>{platform}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Select label="טון דיבור מועדף" value={form.toneStyle} onChange={(e) => update("toneStyle", e.target.value)}>
            <option value="">לא נבחר</option>
            {TONE_STYLES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </Select>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>לוח עברי</h2>
          <Toggle
            checked={form.showParasha}
            onChange={(v) => update("showParasha", v)}
            label="הצגת פרשת השבוע"
            description="מוצג בדשבורד, ומשמש כהשראה לרעיונות תוכן קרוב לשבת."
          />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>התראות</h2>
          <Toggle
            checked={form.whatsappNotificationsEnabled}
            onChange={(v) => update("whatsappNotificationsEnabled", v)}
            label="תזכורת יומית בוואטסאפ"
            description="הודעה יומית עם רעיונות תוכן חדשים למספר הוואטסאפ שלך."
          />
        </section>

        {message && (
          <p className={message.type === "error" ? styles.formError : styles.formSuccess} role="status">
            {message.text}
          </p>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="primary" onClick={handleSave} isLoading={saving} className={styles.grow}>
            {saving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </Card>

      {/* A separate Card, not another section inside the main one - delete-account is an
          independent, immediate action (its own confirmation modal), not part of the "שמירה"
          flow above, so it shouldn't visually read as just another settings field. */}
      <Card className={styles.dangerZone}>
        <h2 className={styles.dangerZoneTitle}>אזור מסוכן</h2>
        <p className={styles.dangerZoneText}>מחיקת החשבון היא פעולה בלתי הפיכה שמוחקת את כל הנתונים שלך לצמיתות.</p>
        <DeleteAccountButton />
      </Card>
    </>
  );
}
