import { privateMetadata } from "@/lib/seo";
export const metadata = privateMetadata(
  "Admin",
  "Private Partiers administration.",
);
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
