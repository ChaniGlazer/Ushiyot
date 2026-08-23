import { NextResponse } from "next/server";
import { getDailyInfo } from "@/lib/hebcal";

export async function GET() {
  try {
    const info = await getDailyInfo();
    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      {
        error: "שגיאה בשליפת נתוני הלוח העברי",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
