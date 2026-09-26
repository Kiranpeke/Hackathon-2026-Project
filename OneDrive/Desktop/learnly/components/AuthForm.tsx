/**
 * components/AuthForm.tsx
 *
 * Shared sign-in / sign-up form component.
 * Handles email + password auth via Supabase browser client.
 * Also handles password reset request (forgot password).
 *
 * All three modes share the same warm editorial visual language as the
 * rest of Learnly (stone neutrals, amber accent, clean typography).
 *
 * No external form library — plain controlled inputs with validation.
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthMode = "login" | "signup" | "forgot-password";

interface AuthFormProps {
  mode: AuthMode;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5"
    >
      {children}
    </label>
  );
}

function Input({
  id,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
}: {
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      disabled={disabled}
      className={cn(
        "w-full rounded-xl border border-stone-700/60 bg-stone-900/60 px-4 py-3",
        "text-sm text-stone-100 placeholder:text-stone-600",
        "transition-colors duration-150",
        "focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/learn";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "auth_callback_failed"
      ? "Authentication failed. Please try again."
      : null,
  );
  const [success, setSuccess] = useState<string | null>(null);

  // ── Submit handler ─────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Lazy init inside event handler — never runs during SSG
    const supabase = getSupabaseBrowserClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(nextPath);
        router.refresh();

      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${nextPath}`,
          },
        });
        if (error) throw error;
        setSuccess(
          "Check your email — we've sent a confirmation link. Click it to activate your account.",
        );

      } else {
        // forgot-password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setSuccess("Password reset email sent. Check your inbox.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      // Sanitise Supabase error messages for end-users
      setError(sanitiseAuthError(msg));
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot-password";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label={formAriaLabel(mode)}>
      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-800/40 bg-red-900/15 px-4 py-3"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-800/40 bg-emerald-900/15 px-4 py-3"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {/* Email */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete={isLogin ? "email" : "email"}
          required
          disabled={loading || !!success}
        />
      </div>

      {/* Password (not shown for forgot-password) */}
      {!isForgot && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="password">Password</Label>
            {isLogin && (
              <Link
                href="/forgot-password"
                className="text-[10px] text-stone-600 hover:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={setPassword}
              placeholder={isSignup ? "At least 6 characters" : "••••••••"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              disabled={loading || !!success}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 focus-visible:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {isSignup && (
            <p className="mt-1.5 text-[10px] text-stone-700">
              Minimum 6 characters.
            </p>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        id={`auth-${mode}-submit`}
        disabled={loading || !!success}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3.5",
          "text-sm font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
          loading || success
            ? "bg-stone-800 text-stone-500 cursor-not-allowed"
            : "bg-stone-100 text-stone-900 hover:bg-white hover:-translate-y-0.5 shadow-xl shadow-stone-950/60",
        )}
      >
        {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {submitLabel(mode, loading)}
      </button>

      {/* Mode switcher */}
      <div className="text-center text-xs text-stone-600">
        {isLogin && (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-stone-400 hover:text-stone-200 transition-colors"
            >
              Sign up
            </Link>
          </>
        )}
        {isSignup && (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-stone-400 hover:text-stone-200 transition-colors"
            >
              Log in
            </Link>
          </>
        )}
        {isForgot && (
          <>
            Remember it?{" "}
            <Link
              href="/login"
              className="font-semibold text-stone-400 hover:text-stone-200 transition-colors"
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formAriaLabel(mode: AuthMode) {
  if (mode === "login") return "Log in to Learnly";
  if (mode === "signup") return "Create a Learnly account";
  return "Reset your Learnly password";
}

function submitLabel(mode: AuthMode, loading: boolean) {
  if (loading) return "Please wait…";
  if (mode === "login") return "Log in";
  if (mode === "signup") return "Create account";
  return "Send reset email";
}

function sanitiseAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("Email not confirmed")) return "Please confirm your email address first.";
  if (msg.includes("User already registered")) return "An account with this email already exists.";
  if (msg.includes("Password should be")) return "Password must be at least 6 characters.";
  if (msg.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return msg;
}
