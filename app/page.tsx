import type { Metadata } from "next";
import { TripCalendar } from "./components/TripCalendar";

export const metadata: Metadata = {
  title: "Japan Family Trip · August 2026",
  description: "A shared family itinerary for Tokyo, Osaka, Hiroshima and Kyoto.",
};

export default function Home() {
  return <TripCalendar />;
}
