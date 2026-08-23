import { db } from "./db";
import type { ContentIdea } from "./generateIdeas";

export type SendWhatsappResult = {
  success: boolean;
  status: "mock_sent";
};

/**
 * Mock implementation. To connect the real WhatsApp Business API later,
 * replace only the body of this function - every caller stays the same.
 */
export async function sendWhatsappMessage(phone: string, text: string): Promise<SendWhatsappResult> {
  console.log(`[WHATSAPP MOCK] אל: ${phone} | תוכן: ${text}`);

  const creator = db.prepare("SELECT id FROM creators WHERE whatsapp_number = ?").get(phone) as
    | { id: number }
    | undefined;

  db.prepare(
    `INSERT INTO whatsapp_log (creator_id, phone, message_text, status) VALUES (?, ?, ?, 'mock_sent')`,
  ).run(creator?.id ?? null, phone, text);

  return { success: true, status: "mock_sent" };
}

export function formatDailyIdeasMessage(hebrewDateText: string, ideas: ContentIdea[]): string {
  const lines = ideas.map((idea, i) => `${i + 1}. ${idea.title}\n${idea.description}`);

  return [`רעיונות התוכן שלך ל-${hebrewDateText}:`, ...lines].join("\n\n");
}
