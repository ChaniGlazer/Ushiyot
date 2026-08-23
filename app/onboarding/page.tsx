import type { Metadata } from "next";
import OnboardingForm from "./OnboardingForm";

export const metadata: Metadata = {
  title: "הרשמה | ניצוץ",
};

export default function OnboardingPage() {
  return <OnboardingForm />;
}
