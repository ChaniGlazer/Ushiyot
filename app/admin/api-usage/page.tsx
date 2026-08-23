import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { DAILY_COST_LIMIT_USD } from "@/lib/config";
import adminStyles from "../admin.module.css";
import styles from "./api-usage.module.css";

export const metadata: Metadata = {
  title: "מעקב עלויות API | ניצוץ",
};

type UsageRow = {
  creator_id: number;
  date: string;
  call_count: number;
  estimated_cost_usd: number;
  name: string | null;
  email: string | null;
};

export default async function ApiUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const { secret } = await searchParams;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return (
      <main className={adminStyles.unauthorized}>
        <h1>לא מורשה</h1>
        <p className={adminStyles.unauthorizedHint}>יש לגשת עם ?secret= נכון בכתובת.</p>
      </main>
    );
  }

  const rows = db
    .prepare(
      `SELECT api_usage.creator_id, api_usage.date, api_usage.call_count, api_usage.estimated_cost_usd, creators.name, creators.email
       FROM api_usage
       LEFT JOIN creators ON creators.id = api_usage.creator_id
       ORDER BY api_usage.date DESC, api_usage.estimated_cost_usd DESC
       LIMIT 200`,
    )
    .all() as UsageRow[];

  const totalCostShown = rows.reduce((sum, row) => sum + row.estimated_cost_usd, 0);

  return (
    <main className={adminStyles.pageWide}>
      <Link href={`/admin?secret=${encodeURIComponent(secret)}`} className={adminStyles.backLink}>
        ← לעמוד הניהול המרכזי
      </Link>
      <h1 className={styles.title}>מעקב עלויות OpenAI</h1>
      <p className={styles.subtitle}>
        תקרה יומית ליוצרת: ${DAILY_COST_LIMIT_USD.toFixed(2)} · סה&quot;כ בטבלה למטה: ${totalCostShown.toFixed(4)}
      </p>

      {rows.length === 0 ? (
        <p className={styles.empty}>אין עדיין נתוני שימוש.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.headRow}>
                <th className={styles.cell}>תאריך</th>
                <th className={styles.cell}>יוצרת</th>
                <th className={styles.cell}>מס&apos; קריאות</th>
                <th className={styles.cell}>עלות משוערת</th>
                <th className={styles.cell}>% מהתקרה היומית</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const percentOfCap = Math.min(100, (row.estimated_cost_usd / DAILY_COST_LIMIT_USD) * 100);
                const isNearOrOverCap = percentOfCap >= 90;

                return (
                  <tr key={`${row.creator_id}-${row.date}`} className={styles.row}>
                    <td className={styles.cell}>{row.date}</td>
                    <td className={styles.cell}>{row.name ?? row.email ?? `#${row.creator_id}`}</td>
                    <td className={styles.cell}>{row.call_count}</td>
                    <td className={styles.cell}>${row.estimated_cost_usd.toFixed(4)}</td>
                    <td className={`${styles.cell} ${isNearOrOverCap ? styles.overCap : ""}`}>
                      {isNearOrOverCap && (
                        <span aria-hidden="true">
                          ⚠️{" "}
                        </span>
                      )}
                      {percentOfCap.toFixed(0)}%
                      {isNearOrOverCap && <span className="srOnly"> (קרוב לתקרה היומית או חורג ממנה)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
