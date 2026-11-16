import Link from "next/link";
import { buttonClasses, Card } from "./ui";

export default function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <Card flat className="p-6 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
      {href && action && (
        <Link
          href={href}
          className={buttonClasses({
            variant: "secondary",
            className: "mt-4 inline-block",
          })}
        >
          {action}
        </Link>
      )}
    </Card>
  );
}
