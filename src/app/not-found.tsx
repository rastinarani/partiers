import Link from "next/link";
import { buttonClasses, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          404 · Page not found
        </p>
        <h1 className="mt-3 text-3xl font-bold">We couldn’t find that page</h1>
        <p className="mt-3 text-muted">
          The link may be out of date, or the page may have moved. Let’s get you
          back to the party planning.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClasses()}>
            Back to home
          </Link>
          <Link
            href="/#booking"
            className={buttonClasses({ variant: "secondary" })}
          >
            Plan an event
          </Link>
        </div>
      </Card>
    </div>
  );
}
