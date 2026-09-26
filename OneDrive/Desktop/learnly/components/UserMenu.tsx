/**
 * components/UserMenu.tsx
 *
 * Authenticated user menu — shows in the /learn and /learn/[subject] navs.
 * Displays user email initial, opens a small dropdown with:
 *   - Email address
 *   - Sign out button
 *
 * Completely client-side — reads session from Supabase browser client.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  email: string;
}

export default function UserMenu({ email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  async function handleSignOut() {
    setLoading(true);
    // Lazy init — only runs client-side on click
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = email[0]?.toUpperCase() ?? "?";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        id="user-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`User menu for ${email}`}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2 py-1.5",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
          open ? "bg-stone-800" : "hover:bg-stone-900",
        )}
      >
        {/* Avatar */}
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/40 border border-amber-600/30 text-[10px] font-bold text-amber-400"
          aria-hidden="true"
        >
          {initial}
        </div>
        <ChevronDown
          size={11}
          className={cn(
            "text-stone-600 transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-label="User options"
          className={cn(
            "absolute right-0 top-full mt-1.5 min-w-[200px]",
            "rounded-xl border border-stone-800 bg-stone-900 shadow-2xl shadow-stone-950/80",
            "animate-scale-in z-50",
          )}
        >
          {/* Email header */}
          <div className="px-4 py-3 border-b border-stone-800">
            <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-0.5">
              Signed in as
            </p>
            <p className="text-xs font-semibold text-stone-300 truncate max-w-[176px]">
              {email}
            </p>
          </div>

          {/* Sign out */}
          <div className="p-1.5">
            <button
              type="button"
              id="user-menu-signout"
              role="menuitem"
              onClick={handleSignOut}
              disabled={loading}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5",
                "text-xs font-medium text-stone-400 hover:text-red-300 hover:bg-red-900/20",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                loading && "opacity-50 cursor-not-allowed",
              )}
            >
              <LogOut size={13} aria-hidden="true" />
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
