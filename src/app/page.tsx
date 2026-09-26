import BookingForm from "@/components/BookingForm";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Book a sitter your kids will actually beg for.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Pick a date and time below and tell us a bit about your little one. We&rsquo;ll follow
          up to confirm &mdash; nothing is booked automatically.
        </p>
      </div>

      <BookingForm />
    </div>
  );
}
