/**
 * app/learn/[subject]/page.tsx
 *
 * Adaptive learning dashboard for a specific subject.
 * Route: /learn/adsa | /learn/at | /learn/dbms
 *
 * Server Component — reads authenticated user from Supabase and passes
 * email to SubjectDashboard for the nav UserMenu.
 *
 * Middleware guarantees only authenticated users reach this route.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_SUBJECTS } from "@/lib/subjects";
import SubjectDashboard from "@/components/SubjectDashboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Available subject slugs
// ---------------------------------------------------------------------------

const AVAILABLE_SLUGS = new Set(["adsa", "at", "dbms"]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Params {
  subject: string;
}

// ---------------------------------------------------------------------------
// Static params (enables SSG for known slugs)
// ---------------------------------------------------------------------------

export function generateStaticParams(): Params[] {
  return Array.from(AVAILABLE_SLUGS).map((s) => ({ subject: s }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { subject } = await params;
  const def = ALL_SUBJECTS.find(
    (s) => s.id.toLowerCase() === subject.toLowerCase(),
  );
  if (!def) return { title: "Subject not found" };
  return {
    title: def.name,
    description: `Adaptive learning for ${def.name}. Learnly identifies your gaps and builds a personalised lesson path.`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SubjectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { subject } = await params;
  const slug = subject.toLowerCase();

  if (!AVAILABLE_SLUGS.has(slug)) notFound();

  const subjectDef = ALL_SUBJECTS.find((s) => s.id.toLowerCase() === slug);
  if (!subjectDef) notFound();

  // Read user for UserMenu in nav (null when Supabase is not yet configured)
  const supabase = await getSupabaseServerClient();
  const userEmail = supabase
    ? (await supabase.auth.getUser()).data.user?.email ?? undefined
    : undefined;

  return <SubjectDashboard initialSubject={subjectDef} userEmail={userEmail} />;
}
