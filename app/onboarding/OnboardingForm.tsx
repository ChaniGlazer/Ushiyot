"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components/ui";
import styles from "./onboarding.module.css";
import { GENDERS, PLATFORMS, SECTORS, TONE_STYLES, isValidIsraeliMobile } from "@/lib/creators";

const FAMILY_STATUSES = ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"];
const TOTAL_STEPS = 4;
const DRAFT_STORAGE_KEY = "nitzotz-onboarding-draft";

type FormState = {
  name: string;
  gender: string;
  password: string;
  confirmPassword: string;
  whatsappNumber: string;
  sector: string;
  niche: string;
  platforms: string[];
  toneStyle: string;
  usesEmojis: boolean;
  childrenCount: string;
  city: string;
  familyStatus: string;
};

const INITIAL_STATE: FormState = {
  name: "",
  gender: "",
  password: "",
  confirmPassword: "",
  whatsappNumber: "",
  sector: "",
  niche: "",
  platforms: [],
  toneStyle: "",
  usesEmojis: false,
  childrenCount: "",
  city: "",
  familyStatus: "",
};

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const stepSectionRef = useRef<HTMLElement>(null);

  // Restore a saved draft after mount only (not during the initial render) so the
  // server-rendered HTML and the first client render still match - avoids a hydration mismatch.
  // The actual state updates are deferred to a microtask so they land as a distinct browser task
  // rather than synchronously inside the effect (avoids a same-tick cascading render).
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<FormState>;
          setForm((prev) => ({ ...prev, ...parsed, password: "", confirmPassword: "" }));
        }
      } catch {
        // corrupt or inaccessible storage - just start fresh
      }
      setDraftRestored(true);
    });
  }, []);

  // Persist on every change, once the restore pass above has already run (otherwise this
  // effect's first run would immediately overwrite the saved draft with the empty initial state).
  useEffect(() => {
    if (!draftRestored) return;
    // Deliberately excludes password/confirmPassword - credentials don't belong in sessionStorage.
    const persisted = {
      name: form.name,
      gender: form.gender,
      whatsappNumber: form.whatsappNumber,
      sector: form.sector,
      niche: form.niche,
      platforms: form.platforms,
      toneStyle: form.toneStyle,
      usesEmojis: form.usesEmojis,
      childrenCount: form.childrenCount,
      city: form.city,
      familyStatus: form.familyStatus,
    };
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(persisted));
  }, [form, draftRestored]);

  // Move focus to the first field/option of the step whenever it changes, for smooth keyboard flow.
  useEffect(() => {
    const container = stepSectionRef.current;
    if (!container) return;
    const firstField = container.querySelector<HTMLElement>("input, select, textarea, button");
    firstField?.focus();
  }, [step]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
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

  function markTouched(key: keyof FormState) {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }

  function touchAll(keys: (keyof FormState)[]) {
    setTouched((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        next[k] = true;
      });
      return next;
    });
  }

  // Pure per-field validation, independent of `touched` - used both to gate
  // step advancement and (once a field is touched) to render its inline error.
  function computeFieldError(key: keyof FormState): string | undefined {
    switch (key) {
      case "name":
        if (!form.name.trim()) return "יש להזין שם";
        return undefined;
      case "password":
        if (!form.password) return "יש להזין סיסמה";
        if (form.password.length < 8) return "הסיסמה חייבת להכיל לפחות 8 תווים";
        return undefined;
      case "confirmPassword":
        if (!form.confirmPassword) return "יש לאמת את הסיסמה";
        if (form.password !== form.confirmPassword) return "הסיסמאות לא תואמות";
        return undefined;
      case "whatsappNumber":
        if (!form.whatsappNumber.trim()) return "יש להזין מספר וואטסאפ";
        if (!isValidIsraeliMobile(form.whatsappNumber)) return "מספר וואטסאפ לא תקין - יש להזין בפורמט 05X-XXXXXXX";
        return undefined;
      case "niche":
        if (!form.niche.trim()) return "יש לציין נישה";
        return undefined;
      default:
        return undefined;
    }
  }

  // Inline error shown under a field - only once the user has interacted with it.
  function fieldError(key: keyof FormState): string | undefined {
    return touched[key] ? computeFieldError(key) : undefined;
  }

  function validateStep(): string | null {
    if (step === 0) {
      const keys: (keyof FormState)[] = ["name", "password", "confirmPassword", "whatsappNumber"];
      touchAll(keys);
      const firstError = keys.map(computeFieldError).find(Boolean);
      if (firstError) return "יש לתקן את השדות המסומנים למעלה";
      if (!form.gender) return "יש לבחור בן או בת";
    }
    if (step === 1) {
      if (!form.sector) return "יש לבחור מגזר";
    }
    if (step === 2) {
      touchAll(["niche"]);
      if (computeFieldError("niche")) return "יש לתקן את השדות המסומנים למעלה";
      if (form.platforms.length === 0) return "יש לבחור לפחות פלטפורמה אחת";
    }
    if (step === 3) {
      if (!form.toneStyle) return "יש לבחור טון דיבור";
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function handleSubmit() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          gender: form.gender,
          password: form.password,
          sector: form.sector,
          niche: form.niche,
          platforms: form.platforms,
          toneStyle: form.toneStyle,
          usesEmojis: form.usesEmojis,
          whatsappNumber: form.whatsappNumber,
          childrenCount: form.childrenCount,
          city: form.city,
          familyStatus: form.familyStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      router.push("/dashboard");
    } catch {
      setError("שגיאת רשת, נסו שוב");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.progress}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`${styles.progressDot} ${i <= step ? styles.progressDotActive : ""}`} />
          ))}
        </div>

        {step === 0 && (
          <section ref={stepSectionRef} className={styles.stepSection}>
            <h2 className={styles.stepTitle}>פרטי התחברות</h2>
            <Input
              label="שם"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => markTouched("name")}
              error={fieldError("name")}
            />
            <span className={styles.fieldLabel} id="gender-label">
              בן או בת?
            </span>
            <div className={styles.cardGrid} role="radiogroup" aria-labelledby="gender-label">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={form.gender === g}
                  className={`${styles.optionCard} ${form.gender === g ? styles.optionCardActive : ""}`}
                  onClick={() => update("gender", g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <Input
              label="מספר וואטסאפ"
              type="tel"
              value={form.whatsappNumber}
              onChange={(e) => update("whatsappNumber", e.target.value)}
              onBlur={() => markTouched("whatsappNumber")}
              error={fieldError("whatsappNumber")}
              placeholder="050-1234567"
            />
            <Input
              label="סיסמה"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              onBlur={() => markTouched("password")}
              error={fieldError("password")}
            />
            <Input
              label="אימות סיסמה"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              onBlur={() => markTouched("confirmPassword")}
              error={fieldError("confirmPassword")}
            />
          </section>
        )}

        {step === 1 && (
          <section ref={stepSectionRef} className={styles.stepSection}>
            <h2 className={styles.stepTitle} id="sector-label">
              מהו המגזר שלך?
            </h2>
            <div className={styles.cardGrid} role="radiogroup" aria-labelledby="sector-label">
              {SECTORS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={form.sector === s}
                  className={`${styles.optionCard} ${form.sector === s ? styles.optionCardActive : ""}`}
                  onClick={() => update("sector", s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section ref={stepSectionRef} className={styles.stepSection}>
            <h2 className={styles.stepTitle}>נישה ופלטפורמות</h2>
            <Input
              label="באיזו נישה את/ה עוסק/ת?"
              type="text"
              value={form.niche}
              onChange={(e) => update("niche", e.target.value)}
              onBlur={() => markTouched("niche")}
              error={fieldError("niche")}
              placeholder="לדוגמה: כושר, פיננסים, הורות, נדל״ן..."
            />
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
          </section>
        )}

        {step === 3 && (
          <section ref={stepSectionRef} className={styles.stepSection}>
            <h2 className={styles.stepTitle}>טון דיבור ופרטים אישיים</h2>
            <span className={styles.fieldLabel} id="tone-label">
              איך היית מגדיר/ה את סגנון הדיבור שלך?
            </span>
            <div className={styles.cardGrid} role="radiogroup" aria-labelledby="tone-label">
              {TONE_STYLES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  role="radio"
                  aria-checked={form.toneStyle === tone}
                  className={`${styles.optionCard} ${form.toneStyle === tone ? styles.optionCardActive : ""}`}
                  onClick={() => update("toneStyle", tone)}
                >
                  {tone}
                </button>
              ))}
            </div>

            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={form.usesEmojis}
                onChange={(e) => update("usesEmojis", e.target.checked)}
              />
              <span>משתמש/ת באימוג&apos;ים בתוכן</span>
            </label>

            <p className={styles.optionalNote}>הפרטים הבאים אופציונליים — עוזרים לנו להתאים תוכן מדויק יותר</p>

            <Input
              label="מספר ילדים (אופציונלי)"
              type="number"
              min={0}
              value={form.childrenCount}
              onChange={(e) => update("childrenCount", e.target.value)}
            />
            <Input
              label="עיר מגורים (אופציונלי)"
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
            <Select
              label="מצב משפחתי (אופציונלי)"
              value={form.familyStatus}
              onChange={(e) => update("familyStatus", e.target.value)}
            >
              <option value="">לא צוין</option>
              {FAMILY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </section>
        )}

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={goBack} disabled={submitting}>
              חזרה
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button type="button" variant="primary" onClick={goNext} className={styles.grow}>
              המשך
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting}
              className={styles.grow}
            >
              {submitting ? "שומר..." : "סיום והרשמה"}
            </Button>
          )}
        </div>

        <p className={styles.linkRow}>
          <Link href="/privacy">איך אנחנו שומרים על הפרטיות שלך</Link>
        </p>
      </Card>
    </div>
  );
}
