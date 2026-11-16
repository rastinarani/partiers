import { Card } from "./ui";

export default function PageSkeleton({
  label = "Loading page",
  calendar = false,
}: {
  label?: string;
  calendar?: boolean;
}) {
  return (
    <div
      className="mx-auto max-w-4xl space-y-6 px-6 py-12"
      role="status"
      aria-label={label}
    >
      <p className="text-sm text-muted">{label}…</p>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-9 w-2/3 rounded-xl bg-primary-soft" />
        <div className="h-4 w-4/5 rounded-lg bg-primary-soft/70" />
        {calendar ? (
          <Card className="p-5">
            <div className="mb-5 h-6 w-1/2 rounded-lg bg-primary-soft" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg bg-primary-soft/70"
                />
              ))}
            </div>
          </Card>
        ) : (
          [1, 2, 3].map((index) => (
            <Card key={index} className="space-y-4 p-6">
              <div className="h-5 w-1/2 rounded-lg bg-primary-soft" />
              <div className="h-4 w-full rounded-lg bg-primary-soft/70" />
              <div className="h-4 w-3/4 rounded-lg bg-primary-soft/70" />
              <div className="h-10 w-28 rounded-xl bg-secondary-soft" />
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
