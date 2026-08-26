"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button, Card, Input, Modal, Select, Spinner } from "@/components/ui";
import { GENDERS, TONE_STYLES, isValidIsraeliMobile, type ToneStyle } from "@/lib/creators";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { TEASER_NICHES, getFeaturedTeaser, getTeaserIdea, type TeaserIdea, type TeaserNiche } from "@/lib/teaserExamples";
import styles from "./home.module.css";

export default function HomeTeaserWidget() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [niche, setNiche] = useState<TeaserNiche>(TEASER_NICHES[0]);
  const [tone, setTone] = useState<ToneStyle>("קליל");
  const [idea, setIdea] = useState<TeaserIdea | null>(null);

  // Loads a real example immediately, with zero clicks, instead of waiting for a visitor to
  // pick a niche/tone and press "צור לי דוגמה" first. Deferred to a client-only effect (not
  // computed during the initial render) because it depends on today's real date, which the
  // server-rendered HTML and the client's first paint could disagree on right at a day
  // boundary - computing it here instead of inline avoids that hydration-mismatch risk entirely.
  useEffect(() => {
    const featured = getFeaturedTeaser();
    // Deferred to a microtask (rather than called synchronously in the effect body) to avoid
    // a same-tick cascading render, matching the pattern used elsewhere for effect-driven setState.
    queueMicrotask(() => {
      setNiche(featured.niche);
      setTone(featured.tone);
      setIdea(featured.idea);
    });
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  function handleGenerate() {
    setIdea(getTeaserIdea(niche, tone));
  }

  function openSignup() {
    setError(null);
    setModalOpen(true);
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idea) return;

    if (!name.trim()) {
      setError("יש להזין שם");
      return;
    }
    if (!gender) {
      setError("יש לבחור בן או בת");
      return;
    }
    if (!isValidIsraeliMobile(whatsappNumber)) {
      setError("מספר וואטסאפ לא תקין - יש להזין בפורמט 05X-XXXXXXX");
      return;
    }
    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }

    setSubmitting(true);
    setError(null);
    // The request below does the full account creation AND today's 4-card generation
    // (with this teaser idea as the first card) in one go - it takes as long as a real
    // OpenAI call, so switch to the full-screen "מכינים לך..." state right away instead of
    // a small in-modal spinner for ~15 seconds.
    setModalOpen(false);
    setGenerating(true);

    try {
      const response = await fetch("/api/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          gender,
          password,
          whatsappNumber,
          niche,
          toneStyle: tone,
          teaserTitle: idea.title,
          teaserDescription: idea.description,
          teaserType: idea.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGenerating(false);
        setModalOpen(true);
        setError(data.error ?? "משהו השתבש, נסו שוב");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setGenerating(false);
      setModalOpen(true);
      setError("שגיאת רשת, נסו שוב");
      setSubmitting(false);
    }
  }

  if (generating) {
    return (
      <div className={styles.teaserGenerating}>
        <Spinner />
        <p>מכינים לך את הרעיונות הבאים...</p>
      </div>
    );
  }

  return (
    <>
      <Card className={styles.teaserCard}>
        <h2 className={styles.teaserTitle}>רוצה לראות דוגמה? בלי הרשמה.</h2>
        <div className={styles.teaserFields}>
          <Select label="נישה" value={niche} onChange={(e) => setNiche(e.target.value as TeaserNiche)}>
            {TEASER_NICHES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Select label="טון דיבור" value={tone} onChange={(e) => setTone(e.target.value as ToneStyle)}>
            {TONE_STYLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" variant="primary" onClick={handleGenerate} className={styles.teaserButton}>
          צור לי דוגמה
        </Button>

        {idea && (
          // key={idea.title} re-triggers this reveal every time the example actually changes
          // (the auto-loaded first example, or a manual "צור לי דוגמה") - a blur-to-clear text
          // reveal plus a brief amber glow flash, so the moment reads as "a real result just
          // arrived" rather than a plain text swap.
          <motion.div
            key={idea.title}
            className={styles.teaserResult}
            initial={prefersReducedMotion ? undefined : { opacity: 0, filter: "blur(12px)" }}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    opacity: 1,
                    filter: "blur(0px)",
                    boxShadow: [
                      "0 0 0px hsl(var(--primary) / 0)",
                      "0 0 36px hsl(var(--primary) / 0.3)",
                      "0 0 0px hsl(var(--primary) / 0)",
                    ],
                  }
            }
            transition={{ duration: DURATION.slow, ease: EASE_PREMIUM }}
          >
            <span className={styles.teaserResultType}>{idea.type}</span>
            <h3 className={styles.teaserResultTitle}>{idea.title}</h3>
            <p className={styles.teaserResultDescription}>{idea.description}</p>
            <div className={styles.teaserResultActions}>
              <Button type="button" variant="primary" size="sm" onClick={openSignup}>
                הרחב לפוסט מלא
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={openSignup}>
                קבל את זה כל יום
              </Button>
            </div>
          </motion.div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="הרשמה מהירה">
        <form onSubmit={handleSignup} className={styles.signupForm}>
          <p className={styles.signupIntro}>
            כמה פרטים ואנחנו יוצרים לך חשבון עם הרעיון שכבר יצרת - ועוד 4 טריים.
          </p>
          <Input label="שם" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className={styles.genderRow} role="radiogroup" aria-label="בן או בת">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={gender === g}
                className={`${styles.genderOption} ${gender === g ? styles.genderOptionActive : ""}`}
                onClick={() => setGender(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <Input
            label="מספר וואטסאפ"
            type="tel"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="050-1234567"
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
            <p className={styles.signupError} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" isLoading={submitting} className={styles.teaserButton}>
            {submitting ? "יוצר חשבון..." : "צרו לי חשבון"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
