import type { Metadata } from "next";

// Current public address recorded in ROADMAP.md; update this when a custom domain is chosen.
export const SITE_URL = "https://partiers.vercel.app";
export const SITE_DESCRIPTION =
  "Games, crafts and kids’ party activities with Nikki and Manna. Explore the activities and request a date for your next get-together.";
export const SHARE_ALT =
  "Partiers — kids’ activities for birthdays, playdates and family gatherings";

export function publicMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | Partiers`,
      description,
      url: path,
      siteName: "Partiers",
      type: "website",
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: SHARE_ALT },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Partiers`,
      description,
      images: [{ url: "/opengraph-image", alt: SHARE_ALT }],
    },
  };
}

export function privateMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: null,
    robots: { index: false, follow: false },
  };
}
