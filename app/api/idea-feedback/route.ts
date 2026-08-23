import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { setIdeaStatus, type IdeaStatus } from "@/lib/ideaHistory";

const VALID_STATUSES: IdeaStatus[] = ["used", "dismissed"];

export async function POST(request: Request) {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { ideaId?: unknown; status?: unknown } | null;

  const ideaId = Number(body?.ideaId);
  if (!Number.isInteger(ideaId) || ideaId <= 0) {
    return NextResponse.json({ error: "ideaId לא תקין" }, { status: 400 });
  }

  const status = body?.status;
  if (typeof status !== "string" || !VALID_STATUSES.includes(status as IdeaStatus)) {
    return NextResponse.json({ error: "status חייב להיות used או dismissed" }, { status: 400 });
  }

  const updated = setIdeaStatus(ideaId, creator.id, status as IdeaStatus);
  if (!updated) {
    return NextResponse.json({ error: "רעיון לא נמצא" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
