import { privateMetadata } from "@/lib/seo";
import LoginForm from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/validation";

export const metadata = privateMetadata(
  "Log in",
  "Log in to view your Partiers bookings and account settings.",
);

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <LoginForm next={safeNextPath(next)} />;
}
