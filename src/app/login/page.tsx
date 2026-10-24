import LoginForm from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/validation";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <LoginForm next={safeNextPath(next)} />;
}
