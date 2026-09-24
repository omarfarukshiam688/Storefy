import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
  password: z.string().min(1, "Password is required").max(255, "Password is too long"),
});

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(255, "Password is too long"),
  name: z.string().min(1, "Name is required").max(255, "Name is too long").optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email is too long"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(255, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password").max(255, "Password is too long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
