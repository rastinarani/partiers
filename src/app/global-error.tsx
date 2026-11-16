"use client";

import ErrorNotice from "@/components/ErrorNotice";
import "./globals.css";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | Partiers</title>
      </head>
      <body style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <main>
          <ErrorNotice retry={retry} />
        </main>
      </body>
    </html>
  );
}
