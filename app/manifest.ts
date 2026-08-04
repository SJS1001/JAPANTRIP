import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Japan Family Trip",
    short_name: "Japan Trip",
    description: "The Smith family’s shared August 2026 Japan itinerary.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f1e9",
    theme_color: "#b7412d",
    orientation: "portrait-primary",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
