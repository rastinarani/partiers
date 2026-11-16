import { privateMetadata } from "@/lib/seo";
import SignupForm from "@/components/auth/SignupForm";
import { safeNextPath } from "@/lib/validation";

export const metadata = privateMetadata(
  "Create an account",
  "Create a Partiers account to keep track of your booking requests.",
);

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const { next } = await searchParams;
  return <SignupForm next={safeNextPath(next)} />;
}
