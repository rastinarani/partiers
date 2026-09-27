import { getApprovedReviews } from "@/lib/reviews";
import ReviewForm from "@/components/ReviewForm";
import StarRating from "@/components/StarRating";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const reviews = await getApprovedReviews();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">What families are saying</h1>
      <p className="mt-2 text-muted">Real reviews from families we&rsquo;ve entertained for.</p>

      <div className="mt-8 space-y-4">
        {reviews.length === 0 && (
          <p className="rounded-2xl border border-card-border bg-card p-6 text-center text-muted">
            No reviews yet &mdash; be the first!
          </p>
        )}

        {reviews.map((review) => (
          <div key={review._id} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{review.name}</p>
              <StarRating value={review.rating} readOnly size="sm" />
            </div>
            <p className="mt-2 text-sm text-muted">{review.comment}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <ReviewForm />
      </div>
    </div>
  );
}
