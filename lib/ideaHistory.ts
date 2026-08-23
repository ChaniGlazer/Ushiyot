import { randomUUID } from "node:crypto";
import { db } from "./db";
import type { ContentIdea } from "./generateIdeas";

export type IdeaStatus = "shown" | "used" | "dismissed";

export type IdeaHistoryRow = {
  id: number;
  creator_id: number;
  date: string;
  idea_title: string;
  idea_description: string;
  idea_type: string;
  status: IdeaStatus;
  created_at: string;
};

export function recordIdeasShown(
  creatorId: number,
  date: string,
  ideas: Omit<ContentIdea, "id">[],
): number[] {
  const batchId = randomUUID();
  const insert = db.prepare(
    `INSERT INTO idea_history (creator_id, date, idea_title, idea_description, idea_type, status, batch_id)
     VALUES (?, ?, ?, ?, ?, 'shown', ?)`,
  );

  return ideas.map((idea) => {
    const result = insert.run(creatorId, date, idea.title, idea.description, idea.type, batchId);
    return Number(result.lastInsertRowid);
  });
}

export type TodaysIdea = ContentIdea & { status: IdeaStatus };

/**
 * The creator's current set of ideas for a given day - i.e. the most recent full batch
 * (from the initial "צור רעיונות" or a later "צור רעיונות מחדש"), so reloading the
 * dashboard shows the same ideas instead of asking again or generating a new set.
 * A batch is identified by size (exactly `expectedCount` rows sharing a batch_id) so
 * single-card "רענן רעיון" refreshes (batches of 1) are correctly ignored here.
 */
export function getTodaysIdeaBatch(creatorId: number, date: string, expectedCount: number): TodaysIdea[] {
  const latestBatch = db
    .prepare(
      `SELECT batch_id, MAX(id) as maxId
       FROM idea_history
       WHERE creator_id = ? AND date = ? AND batch_id IS NOT NULL
       GROUP BY batch_id
       HAVING COUNT(*) = ?
       ORDER BY maxId DESC
       LIMIT 1`,
    )
    .get(creatorId, date, expectedCount) as { batch_id: string } | undefined;

  if (!latestBatch) return [];

  const rows = db
    .prepare(
      `SELECT id, idea_title, idea_description, idea_type, status
       FROM idea_history WHERE batch_id = ? ORDER BY id ASC`,
    )
    .all(latestBatch.batch_id) as {
    id: number;
    idea_title: string;
    idea_description: string;
    idea_type: string;
    status: IdeaStatus;
  }[];

  return rows.map((row) => ({
    id: row.id,
    title: row.idea_title,
    description: row.idea_description,
    type: row.idea_type,
    status: row.status,
  }));
}

export function setIdeaStatus(ideaHistoryId: number, creatorId: number, status: IdeaStatus): boolean {
  const result = db
    .prepare("UPDATE idea_history SET status = ? WHERE id = ? AND creator_id = ?")
    .run(status, ideaHistoryId, creatorId);

  return result.changes > 0;
}
