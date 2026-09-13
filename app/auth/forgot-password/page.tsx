import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/auth/session";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  try {
    await requireAuthUser();
    redirect("/dashboard");
  } catch {
    // Not authenticated, show forgot password form
  }

  return <ForgotPasswordForm />;
}
