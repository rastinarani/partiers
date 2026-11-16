import { publicMetadata } from "@/lib/seo";
import { getApprovedReviews } from "@/lib/reviews";
import FadeIn from "@/components/motion/FadeIn";
import StaggerChildren from "@/components/motion/StaggerChildren";
import ReviewForm from "@/components/ReviewForm";
import StarRating from "@/components/StarRating";
import EmptyState from "@/components/EmptyState";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = publicMetadata(
  "Family reviews",
  "Read approved reviews from families and share your experience with Partiers.",
  "/reviews",
);

export default async function ReviewsPage() {
  const reviews = await getApprovedReviews();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <FadeIn>
        <h1 className="text-3xl font-bold tracking-tight">
          What families are saying
        </h1>
        <p className="mt-2 text-muted">
          Real reviews from families we&rsquo;ve entertained for.
        </p>
      </FadeIn>

      <div className="mt-8 space-y-4">
        {reviews.length === 0 && (
          <EmptyState
            title="The first story is still to come"
            description="Have we helped with your event? Share your experience below. Reviews appear after approval."
            href="#leave-review"
            action="Leave a review"
          />
        )}

        <StaggerChildren className="space-y-4">
          {reviews.map((review) => (
            <Card key={review._id} className="p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{review.name}</p>
                <StarRating value={review.rating} readOnly size="sm" />
              </div>
              <p className="mt-2 text-sm text-muted">{review.comment}</p>
            </Card>
          ))}
        </StaggerChildren>
      </div>

      <div className="mt-10">
        <ReviewForm />
      </div>
    </div>
  );
}
