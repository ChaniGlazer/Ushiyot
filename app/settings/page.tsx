import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCreator } from "@/lib/auth";
import { toCreatorProfile } from "@/lib/creators";
import SettingsForm from "./SettingsForm";
import styles from "./settings.module.css";

export const metadata: Metadata = {
  title: "הגדרות | ניצוץ",
};

export default async function SettingsPage() {
  const creator = await getCurrentCreator();

  if (!creator) {
    redirect("/login");
  }

  const profile = toCreatorProfile(creator);

  return (
    <main className={styles.page}>
      <SettingsForm
        initial={{
          name: profile.name ?? "",
          niche: profile.niche ?? "",
          targetAudience: profile.targetAudience ?? "",
          platforms: profile.platforms,
          toneStyle: profile.toneStyle ?? "",
          showParasha: profile.showParasha,
          whatsappNotificationsEnabled: profile.whatsappNotificationsEnabled,
        }}
      />
    </main>
  );
}
