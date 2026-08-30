import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { isRateLimited } from "@/lib/rateLimit";

type FeedbackPayload = { message?: unknown };

const MAX_MESSAGE_LENGTH = 2000;
const FEEDBACK_RATE_LIMIT = 5;
const FEEDBACK_RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  // By creator id, not IP - this is an authenticated action, and the id is the more precise
  // bucket (matches how a shared/office IP shouldn't throttle unrelated accounts together).
  if (isRateLimited(`feedback:creator:${creator.id}`, FEEDBACK_RATE_LIMIT, FEEDBACK_RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "יותר מדי הערות נשלחו - נסו שוב בעוד כמה דקות" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as FeedbackPayload | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "יש לכתוב הערה לפני השליחה" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `ההערה ארוכה מדי (עד ${MAX_MESSAGE_LENGTH} תווים)` }, { status: 400 });
  }

  db.prepare("INSERT INTO feedback_notes (creator_id, message) VALUES (?, ?)").run(creator.id, message);

  return NextResponse.json({ ok: true }, { status: 201 });
}
