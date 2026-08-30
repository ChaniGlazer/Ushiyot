"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Button, Card, Input, Modal, Select, SparkLoadingExperience } from "@/components/ui";
import { GENDERS, TONE_STYLES, isValidIsraeliMobile, type ToneStyle } from "@/lib/creators";
import { DURATION, EASE_PREMIUM } from "@/lib/motion";
import { TEASER_NICHES, getFeaturedTeaser, getTeaserIdea, type TeaserIdea, type TeaserNiche } from "@/lib/teaserExamples";
import { saveTeaserSelection } from "@/lib/teaserSelection";
import { parseJsonResponse } from "@/lib/parseJsonResponse";
import styles from "./home.module.css";

export default function HomeTeaserWidget() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [niche, setNiche] = useState<TeaserNiche>(TEASER_NICHES[0]);
  const [tone, setTone] = useState<ToneStyle>("קליל");
  const [idea, setIdea] = useState<TeaserIdea | null>(null);
  // Merely viewing the day's auto-loaded example (or reading it in full) is browsing, not a
  // decision - only an actual pick from the niche dropdown below counts as the visitor telling
  // us what they're into. Gates both the localStorage carry-over to onboarding and the niche
  // confirmation defaulted into the signup modal (see handleNicheChange and the modal below).
  const [nicheChosenByUser, setNicheChosenByUser] = useState(false);

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

  // Only persisted once the visitor has actually chosen a niche themselves (see
  // nicheChosenByUser) - never from the zero-click auto-loaded default, so the post-signup
  // profile questionnaire (OnboardingForm) only ever prefills from a real choice, not from
  // whatever example happened to be on screen (see lib/teaserSelection).
  useEffect(() => {
    if (!nicheChosenByUser) return;
    saveTeaserSelection({ niche, tone });
  }, [niche, tone, nicheChosenByUser]);

  function handleNicheChange(value: TeaserNiche) {
    setNicheChosenByUser(true);
    setNiche(value);
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  // The niche an account actually gets created with - a separate, explicit, open text field
  // inside the signup modal (see below), not an implicit carry-over from whatever example the
  // visitor happened to be looking at when they clicked through, and not limited to the fixed
  // list of demo niches either - same open field as the regular onboarding questionnaire.
  // Defaulted from the currently viewed niche when the modal opens (openSignup), but the visitor
  // sees and can freely rewrite it before submitting - reading an example, or clicking "get this
  // every day", is never by itself what decides this.
  const [confirmedNiche, setConfirmedNiche] = useState<string>(niche);

  function handleGenerate() {
    setIdea(getTeaserIdea(niche, tone));
  }

  function openSignup() {
    setError(null);
    setConfirmedNiche(niche);
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
    if (!confirmedNiche.trim()) {
      setError("יש לציין נישה");
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

    // The demo card (title/description/type) is only reused as the account's first idea when
    // the confirmed niche still matches the one it was actually written for - otherwise the
    // account would open on a card about a completely different topic than the niche the
    // visitor just typed in. Any edit to the niche field means we can no longer vouch the demo
    // is on-topic, so it's dropped entirely and every card is generated fresh for the real niche.
    const nicheMatchesDemo = confirmedNiche.trim() === niche;

    try {
      const response = await fetch("/api/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          gender,
          password,
          whatsappNumber,
          niche: confirmedNiche.trim(),
          toneStyle: tone,
          ...(nicheMatchesDemo
            ? { teaserTitle: idea.title, teaserDescription: idea.description, teaserType: idea.type }
            : {}),
        }),
      });

      const data = await parseJsonResponse(response);

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
    // Same full-screen "thinking" experience as regenerating ideas from the dashboard - a first
    // impression of the product shouldn't look like a bare spinner while a plain spinner is all
    // a returning creator gets elsewhere.
    return <SparkLoadingExperience isLoading />;
  }

  return (
    <>
      <Card className={styles.teaserCard}>
        <h2 className={styles.teaserTitle}>רוצה לראות דוגמה? בלי הרשמה.</h2>
        <div className={styles.teaserFields}>
          <Select label="נישה" value={niche} onChange={(e) => handleNicheChange(e.target.value as TeaserNiche)}>
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
            <p className={styles.teaserResultNote}>
              זו דוגמה כללית לנישה שבחרת. בהרשמה נתאים את הרעיונות במדויק יותר — לקהל היעד, לפלטפורמות ולסגנון
              האישי שלך.
            </p>
          </motion.div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="הרשמה מהירה">
        <form onSubmit={handleSignup} className={styles.signupForm}>
          <p className={styles.signupIntro}>
            כמה פרטים ואנחנו יוצרים לך חשבון עם הרעיון שכבר יצרת - ועוד 4 טריים.
          </p>
          {/* Explicit, separate confirmation - not inherited silently from whichever example the
              visitor happened to be reading. Defaults to it (openSignup), but the visitor sees and
              can change it right here, before the account is actually created with it. */}
          <Input
            label="באיזו נישה את/ה עוסק/ת?"
            type="text"
            value={confirmedNiche}
            onChange={(e) => setConfirmedNiche(e.target.value)}
            placeholder="לדוגמה: כושר, פיננסים, הורות, נדל״ן..."
          />
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
