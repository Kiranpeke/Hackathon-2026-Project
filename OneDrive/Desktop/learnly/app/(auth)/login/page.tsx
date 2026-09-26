/**
 * app/(auth)/login/page.tsx — /login
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Log in | Learnly",
  description: "Log in to your Learnly account.",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm animate-fade-up">
      {/* Heading */}
      <div className="mb-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 mb-3">
          Welcome back
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
          Log in to Learnly
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Continue your personalised learning path.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-7">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
