"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button, Card, SparkButton, SparkLoadingExperience } from "@/components/ui";
import { getEntranceMotionProps } from "@/lib/useEntranceMotion";
import { DURATION, EASE_PREMIUM, SPRING_SOFT, STAGGER_STEP } from "@/lib/motion";
import styles from "./dashboard.module.css";
import type { ContentIdea } from "@/lib/generateIdeas";

const CARD_HOVER_TRANSITION = SPRING_SOFT;

/** Splits idea text into sentence-ish chunks (kept punctuation) for the line-by-line reveal
 * on a freshly generated card - actual per-line wrapping isn't knowable without measuring
 * layout, so sentences are the practical stand-in for "reveals progressively, not all at once". */
function splitIntoSegments(text: string): string[] {
  const parts = text.match(/[^.!?׃]+[.!?׃]*/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
}

type FeedbackStatus = "used" | "dismissed";

type Props = {
  creatorId: number;
  initialIdeas: ContentIdea[];
  initialFeedback: Record<number, FeedbackStatus>;
  remainingBatches: number;
};

const IDEA_COUNT = 4;

const CATEGORY_LABELS: Record<string, string> = {
  mainstream: "יציב ובטוח",
  trending: "טרנדי היום",
  wildcard: "יוצא דופן",
};

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  mainstream: "categoryMainstream",
  trending: "categoryTrending",
  wildcard: "categoryWildcard",
};

async function fetchIdeas(
  creatorId: number,
  count: number,
  hint: string,
  remember: boolean,
): Promise<ContentIdea[]> {
  const hintParam = hint.trim() ? `&hint=${encodeURIComponent(hint.trim())}` : "";
  const rememberParam = remember && hint.trim() ? "&remember=true" : "";
  const response = await fetch(`/api/generate-ideas?creatorId=${creatorId}&count=${count}${hintParam}${rememberParam}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "שגיאה ביצירת רעיונות תוכן");
  }

  return data.ideas as ContentIdea[];
}

export default function IdeasBoard({ creatorId, initialIdeas, initialFeedback, remainingBatches }: Props) {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [ideas, setIdeas] = useState<ContentIdea[]>(initialIdeas);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(remainingBatches);
  const [loadingAll, setLoadingAll] = useState(false);
  const [refreshingIndex, setRefreshingIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, FeedbackStatus>>(initialFeedback);
  const [feedbackLoadingId, setFeedbackLoadingId] = useState<number | null>(null);
  const [hint, setHint] = useState("");
  const [remember, setRemember] = useState(false);
  // The hint field starts collapsed to a plain "+ הוסף כיוון" link (merged under the section
  // title, no box of its own) instead of an always-open bordered panel - opens into the real
  // textarea only once someone actually wants to use it.
  const [hintExpanded, setHintExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [expandingId, setExpandingId] = useState<number | null>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);
  // True once a regenerate has completed at least once in this session - freshly generated
  // cards get the "moment it's ready" blur-to-clear reveal (see mosaicClass render below)
  // instead of the scroll-triggered fade-up used for the page's initial server-rendered batch.
  const [hasFreshBatch, setHasFreshBatch] = useState(false);
  // Gates the real cards grid during a regenerate: goes false the instant a regenerate starts,
  // and only comes back true once SparkLoadingExperience's own fade-out finishes (its
  // onComplete callback) - not the instant loadingAll flips false - so the loading theater
  // never gets cut off mid-animation by the real cards popping in underneath it.
  const [showResults, setShowResults] = useState(true);

  // Close the open card menu on outside click or Escape.
  useEffect(() => {
    if (openMenuIndex === null) return;

    function handleClickOutside(e: MouseEvent) {
      if (openMenuRef.current && !openMenuRef.current.contains(e.target as Node)) {
        setOpenMenuIndex(null);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuIndex(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuIndex]);

  async function handleRegenerateAll() {
    setLoadingAll(true);
    setShowResults(false);
    setError(null);
    try {
      const newIdeas = await fetchIdeas(creatorId, IDEA_COUNT, hint, remember);
      setIdeas(newIdeas);
      setHasFreshBatch(true);
      setFeedback({});
      setRemaining((prev) => Math.max(0, prev - 1));
      setRemember(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת רעיונות תוכן");
    } finally {
      setLoadingAll(false);
    }
  }

  async function handleRefreshOne(index: number) {
    setRefreshingIndex(index);
    setOpenMenuIndex(null);
    setError(null);
    try {
      const [newIdea] = await fetchIdeas(creatorId, 1, hint, false);
      setIdeas((prev) => prev.map((idea, i) => (i === index ? newIdea : idea)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ברענון הרעיון");
    } finally {
      setRefreshingIndex(null);
    }
  }

  async function handleFeedback(idea: ContentIdea, status: FeedbackStatus) {
    const previousStatus = feedback[idea.id];

    // Optimistic update: reflect the click immediately, roll back only if the request fails.
    setFeedback((prev) => ({ ...prev, [idea.id]: status }));
    setFeedbackLoadingId(idea.id);
    setError(null);
    try {
      const response = await fetch("/api/idea-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: idea.id, status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "שגיאה בעדכון הסטטוס");
      }
    } catch (err) {
      setFeedback((prev) => {
        const next = { ...prev };
        if (previousStatus === undefined) {
          delete next[idea.id];
        } else {
          next[idea.id] = previousStatus;
        }
        return next;
      });
      setError(err instanceof Error ? err.message : "שגיאה בעדכון הסטטוס");
    } finally {
      setFeedbackLoadingId(null);
    }
  }

  async function handleCopy(idea: ContentIdea, index: number) {
    try {
      const textToCopy = drafts[idea.id] ?? `${idea.title}\n\n${idea.description}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 2000);
    } catch {
      setError("לא הצלחנו להעתיק ללוח - נסו להעתיק ידנית");
    }
  }

  async function handleExpand(idea: ContentIdea) {
    setExpandingId(idea.id);
    setError(null);
    try {
      const response = await fetch("/api/expand-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          title: idea.title,
          description: idea.description,
          type: idea.type,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "שגיאה בהרחבת הרעיון");
      }

      setDrafts((prev) => ({ ...prev, [idea.id]: data.draft_text }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהרחבת הרעיון");
    } finally {
      setExpandingId(null);
      setOpenMenuIndex(null);
    }
  }

  if (ideas.length === 0) {
    return (
      <section className={styles.ideasSection}>
        <h2 className={styles.preGenTitle}>מה תרצה לספר לי היום?</h2>
        <div className={styles.promptStream}>
          <span className={styles.promptStreamIcon} aria-hidden="true">
            ✨
          </span>
          <textarea
            className={styles.hintTextarea}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="כיוון לרעיונות היום (רשות) - למשל: 'משהו על חזרה לשגרה'"
            maxLength={200}
            rows={3}
          />
        </div>
        <label className={styles.rememberOption}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>לזכור את זה גם בפעמים הבאות</span>
        </label>

        {error && (
          <p className={styles.errorBanner} role="alert">
            {error}
          </p>
        )}

        <SparkButton onClick={handleRegenerateAll} isLoading={loadingAll} className={styles.sparkButtonFull}>
          {loadingAll ? "יוצר רעיונות..." : "צור רעיונות"}
        </SparkButton>
        <SparkLoadingExperience isLoading={loadingAll} />
      </section>
    );
  }

  return (
    <section className={styles.ideasSection}>
      <div className={styles.ideasHeader}>
        <div>
          <h2 className={styles.sectionTitle}>רעיונות תוכן להיום</h2>
          <p className={styles.remainingText}>
            {remaining > 0
              ? `${IDEA_COUNT} ניצוצות התוכן היומיים שלך - מתחדשים כל יום.`
              : "כבר יצרת מלא ניצוצות תוכן היום ✨ מחר מחכה לך סבב טרי."}
          </p>
          {/* Merged under the title, not a separate bordered box - collapsed to a plain link
              by default, expands into the real hint textarea only on click. */}
          {!hintExpanded && (
            <button type="button" className={styles.hintToggle} onClick={() => setHintExpanded(true)}>
              + הוסף כיוון לרעיונות היום
            </button>
          )}
        </div>
        {/* On mobile this wrapper becomes a fixed bottom bar (see .regenerateStickyWrap) so the
            main action stays reachable while scrolling through the day's cards - on desktop it's
            just a plain flex item, unchanged from before. */}
        <div className={styles.regenerateStickyWrap}>
          <SparkButton onClick={handleRegenerateAll} isLoading={loadingAll} disabled={remaining <= 0}>
            {loadingAll ? "יוצר רעיונות..." : "צור רעיונות מחדש"}
          </SparkButton>
        </div>
      </div>
      <SparkLoadingExperience isLoading={loadingAll} onComplete={() => setShowResults(true)} />

      {hintExpanded && (
        <div className={styles.promptStream}>
          <span className={styles.promptStreamIcon} aria-hidden="true">
            ✨
          </span>
          <textarea
            className={styles.hintTextarea}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="כיוון לרעיונות היום (רשות) - למשל: 'משהו על חזרה לשגרה'"
            maxLength={200}
            rows={2}
            autoFocus
          />
        </div>
      )}

      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}

      {showResults && (
      <div className={styles.cardsGrid}>
        {ideas.map((idea, index) => {
          const isRefreshing = refreshingIndex === index;
          const isExpanding = expandingId === idea.id;
          const mosaicClass = [
            styles.ideaCard,
            index === 0 ? styles.heroCard : "",
            index === ideas.length - 1 ? styles.ideaCardLast : "",
          ]
            .filter(Boolean)
            .join(" ");
          const isHero = index === 0;
          // A freshly-generated batch (just landed from a "צור רעיונות מחדש" call) gets the
          // "moment it's ready" blur-to-clear reveal instead of the scroll-triggered fade-up
          // used for the page's initial server-rendered batch - see hasFreshBatch above.
          const revealProps =
            hasFreshBatch && !prefersReducedMotion
              ? {
                  initial: { opacity: 0, filter: "blur(12px)" },
                  animate: { opacity: 1, filter: "blur(0px)" },
                  transition: { duration: DURATION.entrance, ease: EASE_PREMIUM, delay: index * STAGGER_STEP },
                }
              : getEntranceMotionProps(prefersReducedMotion, index);
          // transition lives *inside* whileHover (not as a sibling top-level prop) so it
          // doesn't collide with revealProps.transition (which carries the stagger delay) -
          // Framer Motion lets each gesture's own transition override the default per-target.
          const hoverProps = prefersReducedMotion
            ? {}
            : { whileHover: { y: isHero ? -6 : -9, scale: isHero ? 1.012 : 1.025, transition: CARD_HOVER_TRANSITION } };

          if (isRefreshing) {
            return (
              <Card as="article" key={idea.id} className={mosaicClass}>
                <div className={styles.cardTopRow}>
                  <span className={`${styles.cardType} ${styles.skeletonChip}`}>&nbsp;</span>
                </div>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </Card>
            );
          }

          return (
          <Card as={motion.article} key={idea.id} className={mosaicClass} {...revealProps} {...hoverProps}>
            <div className={styles.cardTopRow}>
              <div className={styles.cardBadges}>
                <span
                  className={`${styles.categoryBadge} ${styles[CATEGORY_BADGE_CLASS[idea.category] ?? "categoryMainstream"]}`}
                >
                  {CATEGORY_LABELS[idea.category] ?? idea.category}
                </span>
                <span className={styles.cardType}>{idea.type}</span>
              </div>
              {/* The two feedback icons + the "⋮" menu clustered together in one corner,
                  instead of the feedback buttons living full-width at the bottom of the card -
                  the card keeps exactly one prominent action (expandButton, below). */}
              <div className={styles.cardCornerActions}>
                <button
                  type="button"
                  className={`${styles.cardIconButton} ${feedback[idea.id] === "used" ? styles.cardIconButtonUsedActive : ""}`}
                  onClick={() => handleFeedback(idea, "used")}
                  disabled={feedbackLoadingId === idea.id}
                  title="השתמשתי בזה"
                  aria-label="השתמשתי בזה"
                  aria-pressed={feedback[idea.id] === "used"}
                >
                  ✓
                </button>
                <button
                  type="button"
                  className={`${styles.cardIconButton} ${feedback[idea.id] === "dismissed" ? styles.cardIconButtonDismissedActive : ""}`}
                  onClick={() => handleFeedback(idea, "dismissed")}
                  disabled={feedbackLoadingId === idea.id}
                  title="לא בשבילי"
                  aria-label="לא בשבילי"
                  aria-pressed={feedback[idea.id] === "dismissed"}
                >
                  ✗
                </button>
                <div
                  className={styles.cardMenuWrapper}
                  ref={openMenuIndex === index ? openMenuRef : undefined}
                >
                  <button
                    type="button"
                    className={styles.cardMenuTrigger}
                    aria-haspopup="true"
                    aria-expanded={openMenuIndex === index}
                    aria-label="פעולות נוספות"
                    onClick={() => setOpenMenuIndex((cur) => (cur === index ? null : index))}
                  >
                    ⋮
                  </button>
                  {openMenuIndex === index && (
                    <div className={styles.cardMenu} role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.cardMenuItem}
                        onClick={() => {
                          handleCopy(idea, index);
                          setOpenMenuIndex(null);
                        }}
                      >
                        העתק טקסט
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.cardMenuItem}
                        onClick={() => handleRefreshOne(index)}
                      >
                        רענן רעיון
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <h3 className={styles.cardTitle}>{idea.title}</h3>
            {idea.rationale && <p className={styles.cardRationale}>💡 {idea.rationale}</p>}
            <p className={styles.cardDescription}>
              {hasFreshBatch && !prefersReducedMotion
                ? splitIntoSegments(idea.description).map((segment, segmentIndex) => (
                    <motion.span
                      key={segmentIndex}
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{
                        duration: DURATION.base,
                        ease: EASE_PREMIUM,
                        delay: index * STAGGER_STEP + 0.15 + segmentIndex * 0.08,
                      }}
                    >
                      {segment}{" "}
                    </motion.span>
                  ))
                : idea.description}
            </p>
            {drafts[idea.id] === undefined && copiedIndex === index && (
              <p className={styles.cardStatus}>הועתק ללוח ✓</p>
            )}
            {drafts[idea.id] === undefined && (
              <Button
                type="button"
                variant="primary"
                size="md"
                className={styles.expandButton}
                onClick={() => handleExpand(idea)}
                isLoading={isExpanding}
              >
                {isExpanding ? "מרחיב..." : "הרחב לפוסט מלא"}
              </Button>
            )}
            {drafts[idea.id] !== undefined && (
              <>
                <textarea
                  className={styles.draftTextarea}
                  value={drafts[idea.id]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                  rows={5}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => handleCopy(idea, index)}>
                  {copiedIndex === index ? "הועתק ✓" : "העתק טקסט"}
                </Button>
              </>
            )}
          </Card>
          );
        })}
      </div>
      )}
    </section>
  );
}
