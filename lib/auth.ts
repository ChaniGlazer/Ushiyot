import { cookies } from "next/headers";
import { getCreatorBySession, SESSION_COOKIE_NAME, type CreatorRow } from "./session";

export async function getCurrentCreator(): Promise<CreatorRow | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getCreatorBySession(sessionId);
}
