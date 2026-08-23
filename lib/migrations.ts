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

  const ideaHistoryColumns = db.prepare("PRAGMA table_info(idea_history)").all() as { name: string }[];
  if (!ideaHistoryColumns.some((column) => column.name === "batch_id")) {
    db.exec("ALTER TABLE idea_history ADD COLUMN batch_id TEXT;");
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
