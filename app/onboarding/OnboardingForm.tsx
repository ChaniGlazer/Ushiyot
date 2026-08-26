"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, Card, Input, Select, Spinner } from "@/components/ui";
import { useEntranceMotion } from "@/lib/useEntranceMotion";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { readTeaserSelection, clearTeaserSelection } from "@/lib/teaserSelection";
import styles from "./onboarding.module.css";
import { GENDERS, PLATFORMS, VOCABULARY_STYLES, TONE_STYLES, isValidIsraeliMobile } from "@/lib/creators";

const FAMILY_STATUSES = ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה"];
const TOTAL_STEPS = 4;
// Step 0 is the only mandatory one (credentials) - the account is created right after it, and
// steps 1-3 are the post-signup profile questionnaire, each skippable on its own.
const STEP_NAMES = ["פרטי גישה", "נישה וקהל יעד", "פלטפורמות וסגנון שפה", "טון ופרטים אישיים"];
const DRAFT_STORAGE_KEY = "nitzotz-onboarding-draft";
const DRAFT_SAVED_HINT_MS = 2000;
const COMPLETION_SCREEN_MS = 1500;
const STEP_SLIDE_TRANSITION = { duration: DURATION.base, ease: EASE_PREMIUM };

type FormState = {
  name: string;
  gender: string;
  password: string;
  confirmPassword: string;
  whatsappNumber: string;
  vocabularyStyle: string;
  niche: string;
  targetAudience: string;
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
  vocabularyStyle: "",
  niche: "",
  targetAudience: "",
  platforms: [],
  toneStyle: "",
  usesEmojis: false,
  childrenCount: "",
  city: "",
  familyStatus: "",
};

type Props = {
  /** Set when a session already exists (e.g. someone returning via the dashboard's "finish
   * your profile" reminder) - credentials are skipped entirely, straight into the questionnaire. */
  existingCreatorId: number | null;
};

export default function OnboardingForm({ existingCreatorId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(existingCreatorId ? 1 : 0);
  // 1 = advancing (goNext), -1 = retreating (goBack) - drives which side the next step slides
  // in from. The page is dir="rtl", so "forward" enters from the left/exits to the right (the
  // mirror image of the LTR convention), matching Hebrew reading flow - see stepVariants below.
  const [direction, setDirection] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const stepSectionRef = useRef<HTMLElement>(null);
  const entranceProps = useEntranceMotion();

  // The account only exists client-side as `createdCreatorId` once step 0 succeeds - for
  // someone resuming an already-created account, existingCreatorId covers it from the start.
  const [createdCreatorId, setCreatedCreatorId] = useState<number | null>(null);
  const effectiveCreatorId = existingCreatorId ?? createdCreatorId;

  // Restore a saved draft, and a niche/tone already picked in the home page's anonymous teaser
  // (see lib/teaserSelection), after mount only (not during the initial render) so the
  // server-rendered HTML and the first client render still match - avoids a hydration mismatch.
  // The actual state updates are deferred to a microtask so they land as a distinct browser task
  // rather than synchronously inside the effect (avoids a same-tick cascading render).
  useEffect(() => {
    queueMicrotask(() => {
      let restored: Partial<FormState> = {};
      try {
        const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          restored = JSON.parse(saved) as Partial<FormState>;
        }
      } catch {
        // corrupt or inaccessible storage - just start fresh
      }

      // The teaser choice only fills in what the draft didn't already have - an in-progress
      // draft is more authoritative than a pick made earlier on the home page.
      const teaserSelection = readTeaserSelection();
      if (teaserSelection) {
        if (!restored.niche) restored.niche = teaserSelection.niche;
        if (!restored.toneStyle) restored.toneStyle = teaserSelection.tone;
        clearTeaserSelection();
      }

      if (Object.keys(restored).length > 0) {
        setForm((prev) => ({ ...prev, ...restored, password: "", confirmPassword: "" }));
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
      vocabularyStyle: form.vocabularyStyle,
      niche: form.niche,
      targetAudience: form.targetAudience,
      platforms: form.platforms,
      toneStyle: form.toneStyle,
      usesEmojis: form.usesEmojis,
      childrenCount: form.childrenCount,
      city: form.city,
      familyStatus: form.familyStatus,
    };
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(persisted));
    // Deferred to a microtask for the same reason as the restore effect above -
    // avoids a same-tick cascading render from setState inside the effect body.
    queueMicrotask(() => setDraftSaved(true));
    const timeout = setTimeout(() => setDraftSaved(false), DRAFT_SAVED_HINT_MS);
    return () => clearTimeout(timeout);
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
  // Only step 0's fields are ever mandatory - the profile questionnaire (steps 1-3) has
  // nothing to validate here since every field there is optional (see isStepValid/validateStep).
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
      default:
        return undefined;
    }
  }

  // Inline error shown under a field - only once the user has interacted with it.
  function fieldError(key: keyof FormState): string | undefined {
    return touched[key] ? computeFieldError(key) : undefined;
  }

  // Pure check for whether "המשך" should be enabled - mirrors validateStep's conditions
  // without the side effects (touching fields, setting the error banner). Steps 1-3 are
  // always valid to proceed from (or skip) since nothing there is required.
  function isStepValid(): boolean {
    if (step === 0) {
      const keys: (keyof FormState)[] = ["name", "password", "confirmPassword", "whatsappNumber"];
      if (keys.some((key) => computeFieldError(key))) return false;
      if (!form.gender) return false;
    }
    return true;
  }

  function validateStep(): string | null {
    if (step === 0) {
      const keys: (keyof FormState)[] = ["name", "password", "confirmPassword", "whatsappNumber"];
      touchAll(keys);
      const firstError = keys.map(computeFieldError).find(Boolean);
      if (firstError) return "יש לתקן את השדות המסומנים למעלה";
      if (!form.gender) return "יש לבחור בן או בת";
    }
    return null;
  }

  // Step 0 is different from every other step: instead of just validating and sliding to the
  // next screen, it actually creates the account (so the rest of the questionnaire runs against
  // a real, logged-in session) - only advances once that succeeds.
  async function handleCreateAccount() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreatingAccount(true);
    setError(null);

    try {
      const response = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          gender: form.gender,
          password: form.password,
          whatsappNumber: form.whatsappNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
        setCreatingAccount(false);
        return;
      }

      setCreatedCreatorId(data.id);
      setError(null);
      setDirection(1);
      setStep(1);
    } catch {
      setError("שגיאת רשת, נסו שוב");
    } finally {
      setCreatingAccount(false);
    }
  }

  function goNext() {
    if (step === 0) {
      handleCreateAccount();
      return;
    }
    setError(null);
    setDirection(1);
    setStep((s) => s + 1);
  }

  function goBack() {
    setError(null);
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  }

  // x offset is 0 under reduced motion (opacity/position stay put - see useReducedMotion above).
  const stepSlideOffset = prefersReducedMotion ? 0 : 40;
  const stepVariants = {
    enter: (dir: number) => ({ opacity: prefersReducedMotion ? 1 : 0, x: -dir * stepSlideOffset }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: prefersReducedMotion ? 1 : 0, x: dir * stepSlideOffset }),
  };

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      // Only whatever was actually filled in gets sent - skipped fields are simply absent,
      // which /api/profile leaves untouched rather than overwriting with an empty value.
      const profileUpdates: Record<string, unknown> = {};
      if (form.niche.trim()) profileUpdates.niche = form.niche.trim();
      if (form.targetAudience.trim()) profileUpdates.targetAudience = form.targetAudience.trim();
      if (form.vocabularyStyle) profileUpdates.vocabularyStyle = form.vocabularyStyle;
      if (form.platforms.length > 0) profileUpdates.platforms = form.platforms;
      if (form.toneStyle) profileUpdates.toneStyle = form.toneStyle;
      profileUpdates.usesEmojis = form.usesEmojis;
      if (form.childrenCount !== "") profileUpdates.childrenCount = form.childrenCount;
      if (form.city.trim()) profileUpdates.city = form.city.trim();
      if (form.familyStatus) profileUpdates.familyStatus = form.familyStatus;

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileUpdates),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "משהו השתבש, נסו שוב");
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem(DRAFT_STORAGE_KEY);

      // Instant aha moment: generate today's first batch now, while still showing the
      // "מכינים לך..." screen (submitting stays true), so /dashboard opens on 4 ready cards
      // instead of an empty state. Only possible once a niche is actually known - if every
      // screen was skipped, there's nothing to generate from yet, so this is best-effort and
      // conditional: the dashboard's own empty state ("צור רעיונות") is a fine fallback either way.
      if (effectiveCreatorId && form.niche.trim()) {
        try {
          await fetch(`/api/generate-ideas?creatorId=${effectiveCreatorId}`);
        } catch {
          // ignored - see comment above
        }
      }

      setCompleted(true);
      setTimeout(() => router.push("/dashboard"), COMPLETION_SCREEN_MS);
    } catch {
      setError("שגיאת רשת, נסו שוב");
      setSubmitting(false);
    }
  }

  if (completed) {
    return (
      <div className={styles.page}>
        <div className={styles.completionScreen}>
          <div className={styles.completionCheck}>✓</div>
          <h2 className={styles.completionTitle}>יצרנו לך את החשבון!</h2>
          <p>מעבירים אותך לדשבורד...</p>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className={styles.page}>
        <div className={styles.completionScreen}>
          <div className={styles.generatingSpinner}>
            <Spinner />
          </div>
          <h2 className={styles.completionTitle}>מכינים לך את 4 ניצוצות התוכן הראשונים...</h2>
          <p>כמה שניות, ותהיה לך התחלה מוכנה בדשבורד.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.logoLink}>
        ניצוץ
      </Link>
      <Card as={motion.div} className={styles.card} {...entranceProps}>
        <div className={styles.progress}>
          <div className={styles.progressLabel}>
            <span>
              שלב {step + 1} מתוך {TOTAL_STEPS}: {STEP_NAMES[step]}
            </span>
            <span className={`${styles.draftSaved} ${draftSaved ? styles.draftSavedVisible : ""}`}>
              הטיוטה נשמרה ✓
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
        {step === 0 && (
          <motion.section
            key="step-0"
            ref={stepSectionRef}
            className={styles.stepSection}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_SLIDE_TRANSITION}
          >
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
          </motion.section>
        )}

        {step === 1 && (
          <motion.section
            key="step-1"
            ref={stepSectionRef}
            className={styles.stepSection}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_SLIDE_TRANSITION}
          >
            <h2 className={styles.stepTitle}>נישה וקהל יעד</h2>
            <p className={styles.optionalNote}>
              שני השדות כאן אופציונליים - אפשר לדלג ולהשלים בהמשך, אבל ככל שתמלא/י יותר כך הרעיונות יהיו מדויקים יותר.
            </p>
            <Input
              label="באיזו נישה את/ה עוסק/ת? (אופציונלי)"
              type="text"
              value={form.niche}
              onChange={(e) => update("niche", e.target.value)}
              placeholder="לדוגמה: כושר, פיננסים, הורות, נדל״ן..."
            />
            <Input
              label="מי קהל היעד שלך? (אופציונלי)"
              type="text"
              value={form.targetAudience}
              onChange={(e) => update("targetAudience", e.target.value)}
              placeholder="לדוגמה: אמהות צעירות, יזמים מתחילים, סטודנטים..."
            />
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="step-2"
            ref={stepSectionRef}
            className={styles.stepSection}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_SLIDE_TRANSITION}
          >
            <h2 className={styles.stepTitle}>פלטפורמות וסגנון שפה</h2>
            <p className={styles.optionalNote}>גם כאן הכל אופציונלי - אפשר לדלג ולהשלים בהמשך.</p>
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
            <span className={styles.fieldLabel} id="vocabulary-style-label">
              באיזה עולם דימויים, טון דיבור ואוצר מילים תרצה שהתוכן שלך ינוסח?
            </span>
            <div className={styles.cardGrid} role="radiogroup" aria-labelledby="vocabulary-style-label">
              {VOCABULARY_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  role="radio"
                  aria-checked={form.vocabularyStyle === style}
                  className={`${styles.optionCard} ${form.vocabularyStyle === style ? styles.optionCardActive : ""}`}
                  onClick={() => update("vocabularyStyle", style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {step === 3 && (
          <motion.section
            key="step-3"
            ref={stepSectionRef}
            className={styles.stepSection}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_SLIDE_TRANSITION}
          >
            <h2 className={styles.stepTitle}>טון דיבור ופרטים אישיים</h2>
            <p className={styles.optionalNote}>השדה הזה, וכל מה שמתחתיו, אופציונלי.</p>
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
          </motion.section>
        )}
        </AnimatePresence>

        {error && (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          {step > 1 && (
            <Button type="button" variant="secondary" onClick={goBack} disabled={submitting}>
              חזרה
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              variant="primary"
              onClick={goNext}
              disabled={!isStepValid() || creatingAccount}
              isLoading={creatingAccount}
              className={styles.grow}
            >
              {creatingAccount ? "יוצר חשבון..." : "המשך"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting}
              className={styles.grow}
            >
              {submitting ? "שומר..." : "סיום"}
            </Button>
          )}
        </div>

        {/* Skip is only meaningful once an account exists - step 0's credentials stay mandatory.
            On the last step, "skip" and "finish" are the same action (there's no further step
            to advance into), so it calls handleSubmit directly instead of goNext. */}
        {step > 0 && (
          <button
            type="button"
            className={styles.skipLink}
            onClick={step === TOTAL_STEPS - 1 ? handleSubmit : goNext}
            disabled={submitting}
          >
            {step === TOTAL_STEPS - 1 ? "דלג וסיים" : "דלג בינתיים"}
          </button>
        )}

        <p className={styles.linkRow}>
          <Link href="/privacy">איך אנחנו שומרים על הפרטיות שלך</Link>
        </p>
      </Card>
    </div>
  );
}
