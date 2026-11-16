import { privateMetadata } from "@/lib/seo";
export const metadata = privateMetadata(
  "Admin login",
  "Sign in to the private Partiers dashboard.",
);
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
