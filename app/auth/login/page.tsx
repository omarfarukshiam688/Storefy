import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/auth/session";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function LoginPage() {
  try {
    await requireAuthUser();
    redirect("/dashboard");
  } catch {
    // Not authenticated, show login form
  }

  return <SignInForm />;
}
