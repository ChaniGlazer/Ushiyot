import type { Metadata } from "next";
import styles from "./shabbat.module.css";

export const metadata: Metadata = {
  title: "שבת שלום | ניצוץ",
};

export default function ShabbatPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>שבת שלום 🕯️</h1>
      <p className={styles.text}>אתר זה שומר שבת. נשמח לראותך שוב במוצאי שבת.</p>
    </main>
  );
}
