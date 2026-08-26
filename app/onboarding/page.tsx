import type { Metadata } from "next";
import { getCurrentCreator } from "@/lib/auth";
import OnboardingForm from "./OnboardingForm";

export const metadata: Metadata = {
  title: "הרשמה | ניצוץ",
};

// Already-logged-in visitors land here to finish the profile questionnaire later (e.g. via the
// dashboard's reminder banner - see app/dashboard/ProfileReminderBanner.tsx) - credentials are
// skipped entirely since the account already exists, straight into the questionnaire.
export default async function OnboardingPage() {
  const creator = await getCurrentCreator();
  return <OnboardingForm existingCreatorId={creator?.id ?? null} />;
}
