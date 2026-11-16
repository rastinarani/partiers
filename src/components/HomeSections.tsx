import Link from "next/link";
import type { Review } from "@/lib/types";
import StarRating from "./StarRating";
import FadeIn from "./motion/FadeIn";
import { buttonClasses, Card } from "./ui";

const services = [
  {
    title: "Birthday parties",
    detail:
      "Make room for games, crafts and a birthday child with plenty of ideas.",
    activities: "Group games · crafts · scavenger hunts",
  },
  {
    title: "Playdates",
    detail:
      "Give a small get-together a plan, with activities chosen around the children’s ages and interests.",
    activities: "Creative time · games · shared activities",
  },
  {
    title: "Family gatherings",
    detail:
      "Bring some kid-focused fun to a gathering with cousins, friends and family.",
    activities: "Games · face painting · balloon animals",
  },
];
const questions = [
  {
    question: "What ages are the activities for?",
    answer:
      "Tell us the children’s ages when you request a booking. We’ll discuss which activities suit your group before confirming.",
  },
  {
    question: "How many children can I include?",
    answer:
      "The request form accepts groups of 1–50 children. This helps us understand your plans; we’ll confirm whether we can accommodate your group.",
  },
  {
    question: "Can I choose the activities?",
    answer:
      "Yes. Request games, crafts, face painting, balloon animals or a scavenger hunt in the form. Add your theme or ideas in the notes, and we’ll confirm the plan with you.",
  },
  {
    question: "Do I need to pay when I book?",
    answer:
      "No card or payment is needed to send a request. Payment is cash or e-transfer, arranged directly with you.",
  },
  {
    question: "Is my date booked as soon as I send the form?",
    answer:
      "No. Your request starts as pending. We check the date, time and event details, then get in touch using the phone number or email you provide.",
  },
  {
    question: "What if my plans change?",
    answer: (
      <>
        If you booked while signed in, you can cancel eligible upcoming requests
        in{" "}
        <Link href="/account" className="font-medium text-primary underline">
          My bookings
        </Link>
        . For a guest booking or other changes, keep your reference code and
        contact the team when arranging your event.
      </>
    ),
  },
];

export function HomeServices() {
  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="scroll-mt-6 space-y-6"
    >
      <div>
        <p className="text-sm font-semibold text-primary">
          A little structure. A lot of fun.
        </p>
        <h2 id="services-title" className="mt-2 text-2xl font-bold sm:text-3xl">
          Activities for your kind of get-together
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Nikki and Manna help bring the fun. Choose what you’d like in your
          request; we’ll confirm the activities and details together.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {services.map((service) => (
          <Card key={service.title} className="flex flex-col p-6">
            <h3 className="text-lg font-semibold">{service.title}</h3>
            <p className="mt-3 flex-1 text-sm text-muted">{service.detail}</p>
            <p className="mt-5 text-sm font-medium text-primary">
              {service.activities}
            </p>
            <Link
              href="#booking"
              className="mt-5 text-sm font-semibold text-primary underline underline-offset-4"
            >
              Plan your event <span aria-hidden="true">→</span>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function HowBookingWorks() {
  return (
    <section
      aria-labelledby="how-title"
      className="rounded-3xl bg-primary-soft p-6 sm:p-8"
    >
      <h2 id="how-title" className="text-2xl font-bold">
        From idea to party, in three steps
      </h2>
      <ol className="mt-6 grid gap-6 md:grid-cols-3">
        {[
          [
            "Tell us your plans",
            "Pick a date and time, choose activities and tell us about your group.",
          ],
          [
            "We confirm together",
            "We check availability and get in touch to work through the details. Your request isn’t a confirmed booking yet.",
          ],
          [
            "Enjoy the get-together",
            "Once everything is confirmed, we bring the agreed activities. Payment is arranged directly with you.",
          ],
        ].map(([title, detail], index) => (
          <li key={title}>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card font-bold text-primary"
            >
              {index + 1}
            </span>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted">{detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function HomeTestimonials({ reviews }: { reviews: Review[] }) {
  return (
    <section aria-labelledby="testimonials-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="testimonials-title" className="text-2xl font-bold">
          From the families
        </h2>
        <Link
          href="/reviews"
          className="text-sm font-semibold text-primary underline underline-offset-4"
        >
          All reviews
        </Link>
      </div>
      {reviews.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((review) => (
            <Card key={review._id} className="p-5">
              <StarRating value={review.rating} readOnly size="sm" />
              <blockquote className="mt-3 whitespace-pre-wrap break-words text-sm text-muted">
                {review.comment}
              </blockquote>
              <p className="mt-4 break-words text-sm font-semibold">
                {review.name}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <Card flat className="p-6">
          <p className="text-muted">
            Have we helped with your event? We’d love to hear how it went.
          </p>
          <Link
            href="/reviews"
            className={buttonClasses({
              variant: "secondary",
              className: "mt-4 inline-block",
            })}
          >
            Share your experience
          </Link>
        </Card>
      )}
    </section>
  );
}

export function HomeFaq() {
  return (
    <section aria-labelledby="faq-title">
      <FadeIn>
        <h2 id="faq-title" className="text-2xl font-bold">
          A few things you might be wondering
        </h2>
      </FadeIn>
      <div className="mt-5 divide-y divide-card-border rounded-2xl border border-card-border bg-card px-5">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group py-4">
            <summary className="cursor-pointer rounded-md pr-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              {question}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
