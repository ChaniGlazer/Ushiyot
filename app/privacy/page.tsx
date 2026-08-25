import type { Metadata } from "next";
import PrivacyContent from "./PrivacyContent";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "פרטיות | ניצוץ",
};

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <PrivacyContent />
    </main>
  );
}
