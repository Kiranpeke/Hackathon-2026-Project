/**
 * components/AdaptiveLoopViz.tsx
 *
 * Lusion-inspired: a lightweight interactive visualization of the
 * adaptive learning loop (ASSESS → UNDERSTAND → PRACTICE → ADAPT).
 *
 * Responds subtly to pointer position (gentle tilt + node highlight).
 * Falls back gracefully when prefers-reduced-motion is active.
 * No heavy 3D library — pure CSS transforms + React refs.
 */

"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const NODES = [
  {
    id: "assess",
    label: "Assess",
    sub: "Locate the gap",
    color: "var(--gap)",
    angle: 270, // top
  },
  {
    id: "understand",
    label: "Understand",
    sub: "Targeted lesson",
    color: "var(--practicing)",
    angle: 0, // right
  },
  {
    id: "practice",
    label: "Practice",
    sub: "Adaptive questions",
    color: "var(--accent)",
    angle: 90, // bottom
  },
  {
    id: "adapt",
    label: "Adapt",
    sub: "Knowledge updates",
    color: "var(--mastered)",
    angle: 180, // left
  },
] as const;

// polar → cartesian, radius in % relative to container
function polar(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdaptiveLoopViz() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // Subscribe to future media-query changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Tilt on pointer move (Lusion-style depth feeling)
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      // Gentle: max ±6 degrees
      setTilt({ x: dy * -6, y: dx * 6 });
    },
    [reducedMotion],
  );

  const handlePointerLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const R = 38; // orbit radius in %

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full select-none"
      style={{ perspective: "800px" }}
      aria-label="Adaptive learning loop: Assess, Understand, Practice, Adapt"
      role="img"
    >
      {/* Perspective container */}
      <div
        className="relative mx-auto"
        style={{
          width: "100%",
          paddingBottom: "100%",
          maxWidth: "380px",
          transform: reducedMotion
            ? "none"
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: reducedMotion
            ? "none"
            : "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {/* SVG orbit circle + arrows */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          {/* Dashed orbit ring */}
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
            strokeDasharray="3 4"
          />

          {/* Connecting arcs — directional arrows between nodes */}
          {NODES.map((node, i) => {
            const next = NODES[(i + 1) % NODES.length];
            const from = polar(node.angle, R);
            const to = polar(next.angle, R);
            // midpoint slightly inward for a curve feel
            const mid = polar((node.angle + next.angle) / 2, R * 0.88);
            return (
              <path
                key={`arc-${i}`}
                d={`M ${from.x} ${from.y} Q ${mid.x} ${mid.y} ${to.x} ${to.y}`}
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="0.6"
                strokeLinecap="round"
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker
              id="arrow"
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <path d="M0,0 L4,2 L0,4 L1,2 Z" fill="rgba(255,255,255,0.18)" />
            </marker>
          </defs>

          {/* Active node glow ring */}
          {activeNode && (() => {
            const n = NODES.find((n) => n.id === activeNode)!;
            const pos = polar(n.angle, R);
            return (
              <circle
                cx={pos.x}
                cy={pos.y}
                r="6"
                fill="none"
                stroke={n.color}
                strokeWidth="0.8"
                opacity="0.4"
              />
            );
          })()}
        </svg>

        {/* Center "Learnly" label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
              Your path
            </p>
            <p className="text-xs font-semibold text-stone-500 mt-0.5">
              always adapting
            </p>
          </div>
        </div>

        {/* Node labels positioned around the circle */}
        {NODES.map((node) => {
          const pos = polar(node.angle, R);
          const isActive = activeNode === node.id;

          // Determine text alignment based on position
          let textAlign: React.CSSProperties["textAlign"] = "center";
          if (pos.x < 35) textAlign = "right";
          if (pos.x > 65) textAlign = "left";

          return (
            <button
              key={node.id}
              type="button"
              onPointerEnter={() => setActiveNode(node.id)}
              onPointerLeave={() => setActiveNode(null)}
              onFocus={() => setActiveNode(node.id)}
              onBlur={() => setActiveNode(null)}
              aria-label={`${node.label}: ${node.sub}`}
              className="absolute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                minWidth: "80px",
                textAlign,
              }}
            >
              {/* Node dot */}
              <div className="flex justify-center mb-1.5">
                <div
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: isActive ? "10px" : "7px",
                    height: isActive ? "10px" : "7px",
                    backgroundColor: node.color,
                    opacity: isActive ? 1 : 0.55,
                    boxShadow: isActive ? `0 0 10px 3px ${node.color}40` : "none",
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Label */}
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors duration-150",
                  isActive ? "text-stone-200" : "text-stone-600",
                )}
              >
                {node.label}
              </p>
              <p
                className={cn(
                  "text-[9px] leading-tight transition-colors duration-150",
                  isActive ? "text-stone-400" : "text-stone-700",
                )}
              >
                {node.sub}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
