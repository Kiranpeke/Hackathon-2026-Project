/**
 * app/(auth)/signup/page.tsx — /signup
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create account | Learnly",
  description: "Create your free Learnly account and start adaptive learning.",
};

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm animate-fade-up">
      {/* Heading */}
      <div className="mb-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 mb-3">
          Get started
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Free. Personalised. Adapts as you learn.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-7">
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </div>
  );
}
