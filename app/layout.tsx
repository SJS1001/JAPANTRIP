import type { Metadata, Viewport } from "next";
import { Geist, Noto_Serif_JP } from "next/font/google";
import { headers } from "next/headers";
import { OfflineRegistration } from "./components/OfflineRegistration";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const serif = Noto_Serif_JP({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = (requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https")).split(",")[0];
  const previewImage = `${protocol}://${host}/og.png`;
  return {
    title: "Japan Family Trip · August 2026",
    description: "A protected shared calendar for the Smith family’s Japan trip.",
    openGraph: {
      title: "Japan Family Trip · August 2026",
      description: "A protected shared itinerary for Tokyo, Osaka, Hiroshima and Kyoto.",
      type: "website",
      images: [{ url: previewImage, width: 1200, height: 630, alt: "Japan family trip route" }],
    },
    twitter: { card: "summary_large_image", images: [previewImage] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f1e9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <OfflineRegistration />
        {children}
      </body>
    </html>
  );
}
