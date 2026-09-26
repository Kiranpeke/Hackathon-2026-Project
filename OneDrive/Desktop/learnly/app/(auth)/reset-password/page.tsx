/**
 * app/(auth)/reset-password/page.tsx — /reset-password
 *
 * Destination after the user clicks the "Reset password" link in their email.
 * Supabase exchanges the token via the /api/auth/callback route first,
 * then redirects here with an active session.
 *
 * The user enters their new password here.
 */

"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);

    // Lazy init — only runs client-side at runtime, not during static prerender
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message.includes("session") ? "Your reset link has expired. Please request a new one." : error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/learn"), 2000);
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-8 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-600 mb-3">
          Account recovery
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
          Set a new password
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Choose a strong password for your Learnly account.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-800/60 bg-stone-900/40 p-7">
        {success ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-800/40 bg-emerald-900/15 px-4 py-3"
          >
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <p className="text-sm text-emerald-300">
              Password updated. Redirecting to your dashboard…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-800/40 bg-red-900/15 px-4 py-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="new-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className={cn(
                    "w-full rounded-xl border border-stone-700/60 bg-stone-900/60 px-4 py-3",
                    "text-sm text-stone-100 placeholder:text-stone-600",
                    "transition-colors duration-150",
                    "focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30",
                    "disabled:opacity-50",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 focus-visible:outline-none"
                  aria-label={show ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="reset-password-submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5",
                "text-sm font-semibold transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                loading
                  ? "bg-stone-800 text-stone-500 cursor-not-allowed"
                  : "bg-stone-100 text-stone-900 hover:bg-white hover:-translate-y-0.5 shadow-xl shadow-stone-950/60",
              )}
            >
              {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {loading ? "Updating…" : "Update password"}
            </button>

            <p className="text-center text-xs text-stone-600">
              Link expired?{" "}
              <Link
                href="/forgot-password"
                className="font-semibold text-stone-400 hover:text-stone-200 transition-colors"
              >
                Request a new one
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
