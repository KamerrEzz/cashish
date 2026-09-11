import { PageHeader } from "@/components/ui";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { todayMexico } from "@/lib/credit-cycle";

export default function OnboardingPage() {
  const today = todayMexico();
  return (
    <div className="dash-enter space-y-6">
      <PageHeader
        title="Configura Cashish"
        subtitle="Tres pasos: liquidez, tarjeta y tu ingreso de quincena."
      />
      <OnboardingWizard today={today} />
    </div>
  );
}
