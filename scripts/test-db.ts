import { randomUUID } from "node:crypto";
import { db } from "../lib/db";

type Creator = {
  id: number;
  email: string;
  password_hash: string;
  sector: string;
  niche: string;
  tone_style: string;
  uses_emojis: number;
  children_count: number;
  city: string;
  family_status: string;
  platforms: string;
  created_at: string;
};

const email = `test-${randomUUID()}@example.com`;

const insert = db.prepare(`
  INSERT INTO creators
    (email, password_hash, sector, niche, tone_style, uses_emojis, children_count, city, family_status, platforms)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const result = insert.run(
  email,
  "example-password-hash",
  "חילוני",
  "כושר",
  "קליל",
  1,
  2,
  "תל אביב",
  "נשוי/אה",
  JSON.stringify(["אינסטגרם", "טיקטוק"]),
);

const creator = db
  .prepare("SELECT * FROM creators WHERE id = ?")
  .get(result.lastInsertRowid) as Creator | undefined;

if (!creator || creator.email !== email) {
  console.error("הבדיקה נכשלה: היוצר לא נמצא או שהנתונים לא תואמים");
  process.exit(1);
}

console.log("יוצר לדוגמה נוצר ונקרא בהצלחה:");
console.log(creator);

db.prepare("DELETE FROM creators WHERE id = ?").run(creator.id);
console.log("הבדיקה עברה בהצלחה ✔");
