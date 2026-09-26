/**
 * app/(auth)/forgot-password/page.tsx — /forgot-password
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Reset password | Learnly",
  description: "Reset your Learnly account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm animate-fade-up">
      {/* Heading */}
      <div className="mb-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-600 mb-3">
          Account recovery
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Enter your email and we&apos;ll send reset instructions.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-7">
        <Suspense>
          <AuthForm mode="forgot-password" />
        </Suspense>
      </div>

      {/* Privacy note */}
      <p className="mt-5 text-center text-[10px] text-stone-700">
        We won&apos;t confirm whether an account exists for a given email.
      </p>
    </div>
  );
}
