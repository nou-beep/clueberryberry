import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clueberry — a little notebook of crosswords",
    short_name: "Clueberry",
    description:
      "Hand-written crosswords in English, French and Arabic, with a sticker book to fill.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffe6ee",
    theme_color: "#ffe6ee",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
