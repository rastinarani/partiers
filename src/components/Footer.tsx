import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-card-border bg-card text-sm text-muted">
      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-8 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="mb-2 text-lg font-semibold text-foreground">Partiers</p>
          <p>Games, crafts and happy memories for your next kids’ event.</p>
          <p className="mt-2">Serving Metro Vancouver</p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-foreground">Let’s plan something fun</h2>
          <a href="mailto:nikkitheawsome@gmail.com" className="inline-block py-2 text-primary underline underline-offset-4 break-all hover:text-primary-hover">
            nikkitheawsome@gmail.com
          </a>
        </div>
        <nav aria-label="Footer navigation" className="flex flex-col items-start gap-1">
          <h2 className="mb-1 font-semibold text-foreground">Explore</h2>
          <Link href="/" className="py-2 hover:text-primary">Book a party</Link>
          <Link href="/reviews" className="py-2 hover:text-primary">Family reviews</Link>
          <Link href="/about" className="py-2 hover:text-primary">Meet Nikki &amp; Manna</Link>
          <Link href="/account" className="py-2 hover:text-primary">My account</Link>
        </nav>
      </div>
      <p className="border-t border-card-border px-4 py-5 text-center">
        &copy; {new Date().getFullYear()} Partiers &middot;{" "}
        <Link href="/admin/login" className="hover:text-foreground">
          Admin
        </Link>
      </p>
    </footer>
  );
}
