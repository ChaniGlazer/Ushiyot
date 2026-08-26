import type { DatabaseSync } from "node:sqlite";

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      sector TEXT CHECK (sector IN ('חרדי', 'דתי-לאומי', 'מסורתי', 'חילוני')),
      niche TEXT,
      tone_style TEXT CHECK (tone_style IN ('רשמי', 'קליל')),
      uses_emojis INTEGER CHECK (uses_emojis IN (0, 1)),
      children_count INTEGER,
      city TEXT,
      family_status TEXT,
      platforms TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS idea_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      idea_title TEXT NOT NULL,
      idea_description TEXT NOT NULL,
      idea_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'shown' CHECK (status IN ('shown', 'used', 'dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      call_count INTEGER NOT NULL DEFAULT 0,
      estimated_cost_usd REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (creator_id, date)
    );
  `);

  const creatorColumns = db.prepare("PRAGMA table_info(creators)").all() as { name: string }[];
  if (!creatorColumns.some((column) => column.name === "whatsapp_number")) {
    db.exec("ALTER TABLE creators ADD COLUMN whatsapp_number TEXT;");
  }
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_whatsapp_number ON creators(whatsapp_number) WHERE whatsapp_number IS NOT NULL;",
  );
  if (!creatorColumns.some((column) => column.name === "persistent_context")) {
    db.exec("ALTER TABLE creators ADD COLUMN persistent_context TEXT;");
  }
  if (!creatorColumns.some((column) => column.name === "name")) {
    db.exec("ALTER TABLE creators ADD COLUMN name TEXT;");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_creators_name ON creators(name) WHERE name IS NOT NULL;");
  if (!creatorColumns.some((column) => column.name === "gender")) {
    db.exec("ALTER TABLE creators ADD COLUMN gender TEXT CHECK (gender IN ('בן', 'בת'));");
  }
  // Identity-neutral replacement for the old `sector` column (see lib/creators.ts). No CHECK
  // constraint on purpose, so the option wording can evolve without another table rebuild.
  // `sector` itself is left in place (never dropped/renamed, matching this file's convention)
  // and backfilled once so existing creators keep an equivalent tone instead of going blank.
  // Daily-visit streak (see lib/streak.ts). streak_last_active_date is the last Israel-local
  // date the streak was credited - either a real visit or a Shabbat/chag day silently frozen
  // through. streak_frozen_total is a running count of frozen rest-days, purely informational.
  if (!creatorColumns.some((column) => column.name === "streak_count")) {
    db.exec("ALTER TABLE creators ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0;");
  }
  if (!creatorColumns.some((column) => column.name === "streak_last_active_date")) {
    db.exec("ALTER TABLE creators ADD COLUMN streak_last_active_date TEXT;");
  }
  if (!creatorColumns.some((column) => column.name === "streak_frozen_total")) {
    db.exec("ALTER TABLE creators ADD COLUMN streak_frozen_total INTEGER NOT NULL DEFAULT 0;");
  }
  // Counts how many times this creator has expanded an idea to a full draft - one of the
  // signals behind the dashboard's "accuracy gauge" (see lib/accuracyScore.ts). Unlike
  // used/dismissed feedback (already tracked per-idea in idea_history), an expansion isn't
  // tied to a single idea_history row worth persisting on its own, so a running counter is
  // simpler than a new table.
  if (!creatorColumns.some((column) => column.name === "expansions_count")) {
    db.exec("ALTER TABLE creators ADD COLUMN expansions_count INTEGER NOT NULL DEFAULT 0;");
  }
  // Free-text "who this content is for" (e.g. "אמהות צעירות", "יזמים מתחילים") - collected in
  // the post-signup profile questionnaire (see app/onboarding/OnboardingForm.tsx), separate
  // from `niche` (what the content is about). No CHECK constraint, same reasoning as
  // vocabulary_style: descriptions vary too much to usefully constrain.
  if (!creatorColumns.some((column) => column.name === "target_audience")) {
    db.exec("ALTER TABLE creators ADD COLUMN target_audience TEXT;");
  }
  // Personal settings (app/settings) - default to 1 (on) so existing creators keep today's
  // behavior unchanged until they actively opt out. show_parasha gates a real behavior, not
  // just display: it also controls whether the weekly parasha gets injected into the AI prompt
  // (see lib/generateIdeas.ts). There is deliberately no per-creator opt-out for the site-wide
  // Shabbat guard itself (see middleware.ts) - that blocks every visitor unconditionally, by
  // explicit product decision.
  if (!creatorColumns.some((column) => column.name === "show_parasha")) {
    db.exec("ALTER TABLE creators ADD COLUMN show_parasha INTEGER NOT NULL DEFAULT 1;");
  }
  if (!creatorColumns.some((column) => column.name === "whatsapp_notifications_enabled")) {
    db.exec("ALTER TABLE creators ADD COLUMN whatsapp_notifications_enabled INTEGER NOT NULL DEFAULT 1;");
  }
  if (!creatorColumns.some((column) => column.name === "vocabulary_style")) {
    db.exec("ALTER TABLE creators ADD COLUMN vocabulary_style TEXT;");
    db.exec(`
      UPDATE creators SET vocabulary_style = CASE sector
        WHEN 'חרדי' THEN 'עולם דימויים תורני ומעמיק'
        WHEN 'דתי-לאומי' THEN 'ישראלי מודרני עם זיקה למקורות'
        WHEN 'מסורתי' THEN 'חם, אישי ומעורר השראה'
        WHEN 'חילוני' THEN 'שפה מקצועית עסקית ישירה'
        ELSE NULL
      END
      WHERE sector IS NOT NULL;
    `);
  }

  const ideaHistoryColumns = db.prepare("PRAGMA table_info(idea_history)").all() as { name: string }[];
  if (!ideaHistoryColumns.some((column) => column.name === "batch_id")) {
    db.exec("ALTER TABLE idea_history ADD COLUMN batch_id TEXT;");
  }
  if (!ideaHistoryColumns.some((column) => column.name === "category")) {
    db.exec(
      "ALTER TABLE idea_history ADD COLUMN category TEXT CHECK (category IN ('mainstream', 'trending', 'wildcard'));",
    );
  }
  if (!ideaHistoryColumns.some((column) => column.name === "rationale")) {
    db.exec("ALTER TABLE idea_history ADD COLUMN rationale TEXT;");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      message_text TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'mock_sent'
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS current_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      relevant_sectors TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
