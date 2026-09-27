import BookingForm from "@/components/BookingForm";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="relative mb-10 overflow-hidden rounded-3xl px-6 py-14 text-center">
        <div className="blob-field">
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
        </div>

        <div className="relative">
          <span className="mb-4 inline-block rounded-full bg-primary-soft px-4 py-1 text-sm font-semibold text-primary">
            &#127881; Games &middot; parties &middot; pure chaos (the good kind)
          </span>
          <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Kids&rsquo; entertainment that turns any get-together into a party.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Pick a date and time below and tell us about your event. We&rsquo;ll follow up to
            confirm &mdash; nothing is booked automatically.
          </p>
        </div>
      </div>

      <BookingForm />
    </div>
  );
}
