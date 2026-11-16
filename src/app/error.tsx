"use client";

import ErrorNotice from "@/components/ErrorNotice";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorNotice retry={retry} />;
}
