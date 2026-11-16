import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeTestimonials } from "./HomeSections";
import type { Review } from "@/lib/types";

describe("home testimonials", () => {
  it("invites a real review when none are approved, without inventing a rating", () => {
    const html = renderToStaticMarkup(<HomeTestimonials reviews={[]} />);
    expect(html).toContain("Share your experience");
    expect(html).not.toContain("out of 5 stars");
  });
  it("keeps the preview to three actual reviews", () => {
    const reviews: Review[] = Array.from({ length: 4 }, (_, index) => ({ _id: String(index), name: `Parent ${index}`, comment: `Review ${index}`, status: "approved", rating: 4, createdAt: "2026-11-15" }));
    const html = renderToStaticMarkup(<HomeTestimonials reviews={reviews} />);
    expect(html).toContain("Review 0");
    expect(html).toContain("Review 2");
    expect(html).not.toContain("Review 3");
  });
});
