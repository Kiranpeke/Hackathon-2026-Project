/**
 * app/learn/custom/page.tsx — /learn/custom
 *
 * Personalized adaptive learning dashboard for a student-uploaded syllabus.
 *
 * Reads the ParsedSyllabus from sessionStorage (saved by SyllabusUploader),
 * converts it to a SubjectDefinition, and renders it in the existing
 * SubjectDashboard — the full adaptive engine, unchanged.
 *
 * If no syllabus is found in session, redirects to /upload.
 */

import type { Metadata } from "next";
import CustomDashboard from "@/components/CustomDashboard";

export const metadata: Metadata = {
  title: "Your Custom Learning Path",
  description:
    "Adaptive learning dashboard built from your uploaded syllabus. Learnly adapts to your exact course topics.",
};

export default function CustomPage() {
  // CustomDashboard is a client component — it reads sessionStorage and
  // handles the redirect if no syllabus is found.
  return <CustomDashboard />;
}
