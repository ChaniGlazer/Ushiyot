import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    db.exec("CREATE TABLE IF NOT EXISTS _healthcheck (id INTEGER PRIMARY KEY)");
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", details: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
