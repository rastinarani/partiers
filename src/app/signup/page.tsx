import SignupForm from "@/components/auth/SignupForm";
import { safeNextPath } from "@/lib/validation";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return <SignupForm next={safeNextPath(next)} />;
}
