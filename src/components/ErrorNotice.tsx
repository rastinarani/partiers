"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- A full reload also recovers when the router or root layout failed. */

import { useTransition } from "react";
import { Button, buttonClasses, Card } from "./ui";

export default function ErrorNotice({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Card className="p-8 text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl font-bold text-primary"
        >
          !
        </div>
        <h1 className="text-2xl font-bold">We couldn’t load this page</h1>
        <p className="mt-3 text-muted">
          Something interrupted the page. Please try again in a moment. If you
          were planning a booking, your saved draft stays in this browser tab.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            disabled={pending}
            onClick={() => startTransition(() => retry())}
          >
            {pending ? "Trying again…" : "Try again"}
          </Button>
          <a href="/" className={buttonClasses({ variant: "secondary" })}>
            Back to home
          </a>
        </div>
        <p role="status" className="mt-3 text-sm text-muted">
          {pending ? "Reloading the page…" : ""}
        </p>
      </Card>
    </div>
  );
}
