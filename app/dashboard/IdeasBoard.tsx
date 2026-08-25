"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import styles from "./dashboard.module.css";
import type { ContentIdea } from "@/lib/generateIdeas";

type FeedbackStatus = "used" | "dismissed";

const LOADING_MESSAGES = [
  "בודק/ת את היום העברי...",
  "חושב/ת על רעיונות מתאימים לך...",
  "מתאים/ה את הטון האישי שלך...",
];

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
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [expandingId, setExpandingId] = useState<number | null>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Cycle the "still working" hint text while a full generate/regenerate is in flight,
  // so a multi-second wait doesn't feel stuck - purely cosmetic, no real progress tracking.
  useEffect(() => {
    if (!loadingAll) return;
    const interval = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loadingAll]);

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
    setLoadingMessageIndex(0);
    setError(null);
    try {
      const newIdeas = await fetchIdeas(creatorId, IDEA_COUNT, hint, remember);
      setIdeas(newIdeas);
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
      <section>
        <h2 className={styles.preGenTitle}>מה תרצה לספר לי היום?</h2>
        <textarea
          className={styles.hintTextarea}
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="כיוון לרעיונות היום (רשות) - למשל: 'משהו על חזרה לשגרה'"
          maxLength={200}
          rows={3}
        />
        <label className={styles.rememberOption}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>לזכור את זה גם בפעמים הבאות</span>
        </label>

        {error && (
          <p className={styles.errorBanner} role="alert">
            {error}
          </p>
        )}

        <Button type="button" variant="primary" onClick={handleRegenerateAll} isLoading={loadingAll}>
          {loadingAll ? "יוצר רעיונות..." : "צור רעיונות"}
        </Button>
        {loadingAll && <p className={styles.loadingHint}>{LOADING_MESSAGES[loadingMessageIndex]}</p>}
      </section>
    );
  }

  return (
    <section>
      <div className={styles.ideasHeader}>
        <div>
          <h2 className={styles.sectionTitle}>רעיונות תוכן להיום</h2>
          <p className={styles.remainingText}>
            {remaining > 0
              ? `${IDEA_COUNT} ניצוצות התוכן היומיים שלך - מתחדשים כל יום.`
              : "כבר יצרת מלא ניצוצות תוכן היום ✨ מחר מחכה לך סבב טרי."}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleRegenerateAll}
          isLoading={loadingAll}
          disabled={remaining <= 0}
        >
          {loadingAll ? "יוצר רעיונות..." : "צור רעיונות מחדש"}
        </Button>
      </div>
      {loadingAll && <p className={styles.loadingHint}>{LOADING_MESSAGES[loadingMessageIndex]}</p>}

      <textarea
        className={styles.hintTextarea}
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="כיוון לרעיונות היום (רשות) - למשל: 'משהו על חזרה לשגרה'"
        maxLength={200}
        rows={2}
      />

      {error && (
        <p className={styles.errorBanner} role="alert">
          {error}
        </p>
      )}

      <div className={styles.cardsGrid}>
        {ideas.map((idea, index) => {
          const isRefreshing = refreshingIndex === index;
          const isExpanding = expandingId === idea.id;

          if (isRefreshing) {
            return (
              <Card as="article" key={idea.id} className={styles.ideaCard}>
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
          <Card as="article" key={idea.id} className={styles.ideaCard}>
            <div className={styles.cardTopRow}>
              <div className={styles.cardBadges}>
                <span
                  className={`${styles.categoryBadge} ${styles[CATEGORY_BADGE_CLASS[idea.category] ?? "categoryMainstream"]}`}
                >
                  {CATEGORY_LABELS[idea.category] ?? idea.category}
                </span>
                <span className={styles.cardType}>{idea.type}</span>
              </div>
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
            <h3 className={styles.cardTitle}>{idea.title}</h3>
            {idea.rationale && <p className={styles.cardRationale}>💡 {idea.rationale}</p>}
            <p className={styles.cardDescription}>{idea.description}</p>
            {drafts[idea.id] === undefined && copiedIndex === index && (
              <p className={styles.cardStatus}>הועתק ללוח ✓</p>
            )}
            {drafts[idea.id] === undefined && (
              <Button
                type="button"
                variant="primary"
                size="sm"
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
            <div className={styles.feedbackActions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={`${styles.feedbackButton} ${feedback[idea.id] === "used" ? styles.feedbackButtonUsedActive : ""}`}
                onClick={() => handleFeedback(idea, "used")}
                disabled={feedbackLoadingId === idea.id}
              >
                השתמשתי בזה {feedback[idea.id] === "used" && "✓"}
              </Button>
              <Button
                type="button"
                variant="ghost-danger"
                size="sm"
                className={`${styles.feedbackButton} ${feedback[idea.id] === "dismissed" ? styles.feedbackButtonDismissedActive : ""}`}
                onClick={() => handleFeedback(idea, "dismissed")}
                disabled={feedbackLoadingId === idea.id}
              >
                לא בשבילי {feedback[idea.id] === "dismissed" && "✗"}
              </Button>
            </div>
          </Card>
          );
        })}
      </div>
    </section>
  );
}
