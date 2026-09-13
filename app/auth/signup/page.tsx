import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/auth/session";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function SignUpPage() {
  try {
    await requireAuthUser();
    redirect("/dashboard");
  } catch {
    // Not authenticated, show sign up form
  }

  return <SignUpForm />;
}
