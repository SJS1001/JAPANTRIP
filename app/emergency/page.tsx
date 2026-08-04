import EmergencyPage from "@/app/components/EmergencyPage";
import { officialEmergencyDirectory } from "@/lib/emergency";

export const metadata = {
  title: "Emergency help · Japan Trip",
  description: "Offline-ready emergency numbers and official live safety information for Japan.",
};

export default function EmergencyRoute() {
  return (
    <EmergencyPage
      calls={officialEmergencyDirectory.calls}
      liveLinks={officialEmergencyDirectory.liveLinks}
    />
  );
}
