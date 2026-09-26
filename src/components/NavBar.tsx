import Link from "next/link";

const links = [
  { href: "/", label: "Book Us" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
];

export default function NavBar() {
  return (
    <header className="border-b border-card-border bg-card">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            P
          </span>
          Partiers
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-muted">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
