import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-card-border py-6 text-center text-sm text-muted">
      <p>
        &copy; {new Date().getFullYear()} Partiers &middot;{" "}
        <Link href="/admin/login" className="hover:text-foreground">
          Admin
        </Link>
      </p>
    </footer>
  );
}
