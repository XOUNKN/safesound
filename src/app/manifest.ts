import type { MetadataRoute } from "next";
import { BRAND } from "@/server/brand";

/** Lets phones "Add to Home Screen" and open Resonate like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: BRAND.bg,
    theme_color: BRAND.bg,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
