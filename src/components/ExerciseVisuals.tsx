"use client";

import React from "react";
import { Play, Volume2, X } from "lucide-react";
import { Exercise, MuscleGroup } from "@/types/workout";

/**
 * Compact Noir & Or anatomical badge highlighting the target muscle group.
 */
export function MuscleMiniBadge({
  muscleGroup,
  onClick,
}: {
  muscleGroup: MuscleGroup;
  onClick?: () => void;
}) {
  const isBack = muscleGroup === "Dos" || muscleGroup === "Triceps";

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Voir l'animation (${muscleGroup})`}
      className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 transition hover:border-yellow-500/60 active:scale-95"
    >
      <svg viewBox="0 0 40 40" className="h-7 w-7">
        <circle cx="20" cy="6.5" r="3" fill="#3f3f46" />
        <path
          d="M14 11 L26 11 L24 23 L16 23 Z"
          fill={
            muscleGroup === "Chest" || muscleGroup === "Dos"
              ? "#eab308"
              : "#27272a"
          }
        />
        <circle
          cx="12.5"
          cy="12.5"
          r="2.3"
          fill={muscleGroup === "Épaules" ? "#eab308" : "#3f3f46"}
        />
        <circle
          cx="27.5"
          cy="12.5"
          r="2.3"
          fill={muscleGroup === "Épaules" ? "#eab308" : "#3f3f46"}
        />
        <rect
          x="9.5"
          y="14"
          width="3"
          height="9"
          rx="1.5"
          fill={
            muscleGroup === "Biceps" || muscleGroup === "Triceps"
              ? "#eab308"
              : "#3f3f46"
          }
        />
        <rect
          x="27.5"
          y="14"
          width="3"
          height="9"
          rx="1.5"
          fill={
            muscleGroup === "Biceps" || muscleGroup === "Triceps"
              ? "#eab308"
              : "#3f3f46"
          }
        />
        <rect
          x="15.5"
          y="24"
          width="3.5"
          height="12"
          rx="1.5"
          fill={muscleGroup === "Legs" ? "#eab308" : "#27272a"}
        />
        <rect
          x="21"
          y="24"
          width="3.5"
          height="12"
          rx="1.5"
          fill={muscleGroup === "Legs" ? "#eab308" : "#27272a"}
        />
        {isBack && (
          <line
            x1="20"
            y1="11.5"
            x2="20"
            y2="22"
            stroke="#09090b"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        )}
      </svg>
      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-zinc-950 shadow">
        <Play className="h-2.5 w-2.5 fill-current" />
      </span>
    </button>
  );
}

type MovementKind =
  | "ez-bar-curl"
  | "hammer-curl"
  | "shoulder-press"
  | "lateral-raises"
  | "triceps-pushdown"
  | "lat-activation"
  | "lat-pulldown"
  | "rowing"
  | "face-pull"
  | "bench-press"
  | "incline-db"
  | "squats"
  | "leg-curls"
  | "calves";

function getMovementKind(exerciseId: string, muscle: MuscleGroup): MovementKind {
  const known: MovementKind[] = [
    "ez-bar-curl",
    "hammer-curl",
    "shoulder-press",
    "lateral-raises",
    "triceps-pushdown",
    "lat-activation",
    "lat-pulldown",
    "rowing",
    "face-pull",
    "bench-press",
    "incline-db",
    "squats",
    "leg-curls",
    "calves",
  ];
  if (known.includes(exerciseId as MovementKind)) {
    return exerciseId as MovementKind;
  }
  if (muscle === "Biceps") return "ez-bar-curl";
  if (muscle === "Épaules") return "shoulder-press";
  if (muscle === "Triceps") return "triceps-pushdown";
  if (muscle === "Dos") return "lat-pulldown";
  if (muscle === "Chest") return "bench-press";
  return "squats";
}

function AnimatedExerciseSvg({ kind }: { kind: MovementKind }) {
  return (
    <svg
      viewBox="0 0 220 150"
      className="h-48 w-full rounded-xl border border-zinc-800 bg-zinc-950"
    >
      {/* Floor line */}
      <line
        x1="20"
        y1="134"
        x2="200"
        y2="134"
        stroke="#27272a"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* 1. EZ-Bar Strict Curl (Wall) */}
      {kind === "ez-bar-curl" && (
        <g>
          <line x1="74" y1="18" x2="74" y2="134" stroke="#27272a" strokeWidth="3" />
          <circle cx="88" cy="34" r="9" fill="#3f3f46" />
          <line x1="88" y1="45" x2="88" y2="90" stroke="#52525b" strokeWidth="10" strokeLinecap="round" />
          <line x1="88" y1="90" x2="92" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <line x1="88" y1="52" x2="90" y2="78" stroke="#eab308" strokeWidth="7" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="60 90 78; -45 90 78; 60 90 78"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="90" y1="78" x2="124" y2="78" stroke="#a1a1aa" strokeWidth="6" strokeLinecap="round" />
            <circle cx="127" cy="78" r="7" fill="#eab308" />
            <circle cx="127" cy="78" r="3" fill="#09090b" />
          </g>
        </g>
      )}

      {/* 2. Hammer Curl (Front alternating dumbbells) */}
      {kind === "hammer-curl" && (
        <g>
          <circle cx="110" cy="32" r="9" fill="#3f3f46" />
          <path d="M95 45 L125 45 L121 90 L99 90 Z" fill="#52525b" />
          <line x1="103" y1="90" x2="101" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <line x1="117" y1="90" x2="119" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          {/* Left arm (biceps highlighted) */}
          <line x1="93" y1="48" x2="88" y2="76" stroke="#eab308" strokeWidth="7" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 22; 0 -6; 0 22"
              dur="2s"
              repeatCount="indefinite"
            />
            <line x1="88" y1="76" x2="84" y2="76" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" />
            <rect x="78" y="69" width="12" height="14" rx="2" fill="#eab308" />
          </g>
          {/* Right arm */}
          <line x1="127" y1="48" x2="132" y2="76" stroke="#eab308" strokeWidth="7" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 -6; 0 22; 0 -6"
              dur="2s"
              repeatCount="indefinite"
            />
            <rect x="130" y="69" width="12" height="14" rx="2" fill="#eab308" />
          </g>
        </g>
      )}

      {/* 3. Shoulder Press (Overhead Barbell) */}
      {kind === "shoulder-press" && (
        <g>
          <circle cx="110" cy="54" r="9" fill="#3f3f46" />
          <path d="M96 66 L124 66 L120 104 L100 104 Z" fill="#52525b" />
          <line x1="104" y1="104" x2="102" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <line x1="116" y1="104" x2="118" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <circle cx="94" cy="68" r="5" fill="#eab308" />
          <circle cx="126" cy="68" r="5" fill="#eab308" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 -32; 0 0"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="68" y1="54" x2="152" y2="54" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
            <rect x="64" y="47" width="6" height="14" rx="2" fill="#eab308" />
            <rect x="150" y="47" width="6" height="14" rx="2" fill="#eab308" />
            <line x1="86" y1="54" x2="94" y2="68" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" />
            <line x1="134" y1="54" x2="126" y2="68" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* 4. Lateral Raises (T-pose arms out to sides) */}
      {kind === "lateral-raises" && (
        <g>
          <circle cx="110" cy="34" r="9" fill="#3f3f46" />
          <path d="M96 46 L124 46 L120 92 L100 92 Z" fill="#52525b" />
          <line x1="104" y1="92" x2="102" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <line x1="116" y1="92" x2="118" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <circle cx="94" cy="49" r="5" fill="#eab308" />
          <circle cx="126" cy="49" r="5" fill="#eab308" />
          {/* Left arm */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-75 94 49; 0 94 49; -75 94 49"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="94" y1="49" x2="54" y2="49" stroke="#eab308" strokeWidth="6" strokeLinecap="round" />
            <rect x="46" y="43" width="8" height="12" rx="2" fill="#eab308" />
          </g>
          {/* Right arm */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="75 126 49; 0 126 49; 75 126 49"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="126" y1="49" x2="166" y2="49" stroke="#eab308" strokeWidth="6" strokeLinecap="round" />
            <rect x="166" y="43" width="8" height="12" rx="2" fill="#eab308" />
          </g>
        </g>
      )}

      {/* 5. Triceps Pushdown (Cable machine) */}
      {kind === "triceps-pushdown" && (
        <g>
          <line x1="145" y1="14" x2="145" y2="134" stroke="#27272a" strokeWidth="4" />
          <line x1="120" y1="14" x2="145" y2="14" stroke="#27272a" strokeWidth="4" />
          <circle cx="92" cy="36" r="9" fill="#3f3f46" />
          <line x1="92" y1="47" x2="92" y2="90" stroke="#52525b" strokeWidth="10" strokeLinecap="round" />
          <line x1="92" y1="90" x2="94" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <line x1="92" y1="52" x2="98" y2="74" stroke="#eab308" strokeWidth="7" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-20 98 74; 65 98 74; -20 98 74"
              dur="2s"
              repeatCount="indefinite"
            />
            <line x1="98" y1="74" x2="128" y2="74" stroke="#a1a1aa" strokeWidth="6" strokeLinecap="round" />
            <circle cx="128" cy="74" r="4" fill="#eab308" />
          </g>
          <line x1="120" y1="14" x2="128" y2="74" stroke="#eab308" strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      )}

      {/* 6. Lat Activation (Straight-Arm Cable Pullover) */}
      {kind === "lat-activation" && (
        <g>
          <line x1="154" y1="14" x2="154" y2="134" stroke="#27272a" strokeWidth="4" />
          <circle cx="76" cy="48" r="8" fill="#3f3f46" />
          <line x1="80" y1="56" x2="68" y2="92" stroke="#eab308" strokeWidth="10" strokeLinecap="round" />
          <line x1="68" y1="92" x2="72" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-35 80 58; 38 80 58; -35 80 58"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <line x1="80" y1="58" x2="126" y2="58" stroke="#a1a1aa" strokeWidth="6" strokeLinecap="round" />
            <circle cx="126" cy="58" r="4" fill="#eab308" />
          </g>
        </g>
      )}

      {/* 7. Lat Pulldown (Seated pulling bar from overhead) */}
      {kind === "lat-pulldown" && (
        <g>
          <rect x="85" y="102" width="50" height="8" rx="3" fill="#27272a" />
          <line x1="110" y1="10" x2="110" y2="42" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="110" cy="60" r="9" fill="#3f3f46" />
          <path d="M96 72 L124 72 L118 102 L102 102 Z" fill="#eab308" opacity="0.9" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 30; 0 0"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="66" y1="36" x2="154" y2="36" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
            <line x1="76" y1="36" x2="96" y2="72" stroke="#a1a1aa" strokeWidth="4" strokeLinecap="round" />
            <line x1="144" y1="36" x2="124" y2="72" stroke="#a1a1aa" strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* 8. Rowing (Bent-over Barbell Row) */}
      {kind === "rowing" && (
        <g>
          <circle cx="132" cy="54" r="8" fill="#3f3f46" />
          <line x1="126" y1="60" x2="86" y2="86" stroke="#eab308" strokeWidth="11" strokeLinecap="round" />
          <line x1="86" y1="86" x2="82" y2="132" stroke="#3f3f46" strokeWidth="9" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 14; 0 -16; 0 14"
              dur="2s"
              repeatCount="indefinite"
            />
            <line x1="122" y1="64" x2="122" y2="96" stroke="#a1a1aa" strokeWidth="6" strokeLinecap="round" />
            <circle cx="122" cy="98" r="10" fill="#eab308" />
            <circle cx="122" cy="98" r="4" fill="#09090b" />
          </g>
        </g>
      )}

      {/* 9. Face Pull (Horizontal cable pull to face) */}
      {kind === "face-pull" && (
        <g>
          <line x1="170" y1="18" x2="170" y2="134" stroke="#27272a" strokeWidth="4" />
          <circle cx="80" cy="40" r="9" fill="#3f3f46" />
          <line x1="80" y1="51" x2="80" y2="94" stroke="#52525b" strokeWidth="10" strokeLinecap="round" />
          <line x1="80" y1="94" x2="80" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <circle cx="80" cy="52" r="5" fill="#eab308" />
          <line x1="170" y1="44" x2="112" y2="44" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 3" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="26 0; -16 0; 26 0"
              dur="2s"
              repeatCount="indefinite"
            />
            <line x1="82" y1="52" x2="116" y2="44" stroke="#eab308" strokeWidth="6" strokeLinecap="round" />
            <circle cx="118" cy="44" r="5" fill="#eab308" />
          </g>
        </g>
      )}

      {/* 10. Bench Press (Lying flat on bench) */}
      {kind === "bench-press" && (
        <g>
          {/* Flat Bench */}
          <rect x="52" y="96" width="116" height="8" rx="3" fill="#27272a" />
          <line x1="68" y1="104" x2="68" y2="134" stroke="#27272a" strokeWidth="5" />
          <line x1="152" y1="104" x2="152" y2="134" stroke="#27272a" strokeWidth="5" />
          {/* Athlete lying down */}
          <circle cx="64" cy="86" r="8" fill="#3f3f46" />
          <line x1="74" y1="88" x2="136" y2="88" stroke="#eab308" strokeWidth="10" strokeLinecap="round" />
          <line x1="136" y1="88" x2="162" y2="108" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <line x1="162" y1="108" x2="162" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          {/* Animated Barbell */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 -28; 0 0"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="96" y1="82" x2="96" y2="68" stroke="#a1a1aa" strokeWidth="6" strokeLinecap="round" />
            <circle cx="96" cy="64" r="11" fill="#eab308" />
            <circle cx="96" cy="64" r="4" fill="#09090b" />
          </g>
        </g>
      )}

      {/* 11. Incline Dumbbell Press (45 deg bench) */}
      {kind === "incline-db" && (
        <g>
          {/* Incline Bench */}
          <line x1="62" y1="58" x2="112" y2="102" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
          <line x1="112" y1="102" x2="150" y2="102" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
          <line x1="90" y1="84" x2="90" y2="134" stroke="#27272a" strokeWidth="5" />
          <line x1="138" y1="102" x2="138" y2="134" stroke="#27272a" strokeWidth="5" />
          {/* Athlete */}
          <circle cx="68" cy="48" r="8" fill="#3f3f46" />
          <line x1="74" y1="56" x2="110" y2="94" stroke="#eab308" strokeWidth="10" strokeLinecap="round" />
          <line x1="110" y1="94" x2="144" y2="102" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <line x1="144" y1="102" x2="148" y2="132" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 10 -24; 0 0"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="88" y1="68" x2="98" y2="52" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" />
            <rect x="92" y="42" width="14" height="10" rx="2" fill="#eab308" />
          </g>
        </g>
      )}

      {/* 12. Squats (Barbell on back) */}
      {kind === "squats" && (
        <g>
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 28; 0 0"
              dur="2.6s"
              repeatCount="indefinite"
            />
            <circle cx="110" cy="30" r="9" fill="#3f3f46" />
            <line x1="110" y1="41" x2="102" y2="82" stroke="#52525b" strokeWidth="10" strokeLinecap="round" />
            <line x1="70" y1="43" x2="150" y2="43" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
            <rect x="68" y="36" width="6" height="14" rx="2" fill="#eab308" />
            <rect x="146" y="36" width="6" height="14" rx="2" fill="#eab308" />
          </g>
          <line x1="102" y1="82" x2="116" y2="106" stroke="#eab308" strokeWidth="8" strokeLinecap="round">
            <animate attributeName="y1" values="82;110;82" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="x2" values="114;128;114" dur="2.6s" repeatCount="indefinite" />
          </line>
          <line x1="114" y1="106" x2="106" y2="132" stroke="#52525b" strokeWidth="8" strokeLinecap="round">
            <animate attributeName="x1" values="114;128;114" dur="2.6s" repeatCount="indefinite" />
          </line>
        </g>
      )}

      {/* 13. Leg Curls (Lying prone curling heels) */}
      {kind === "leg-curls" && (
        <g>
          <rect x="46" y="88" width="108" height="8" rx="3" fill="#27272a" />
          <line x1="62" y1="96" x2="62" y2="134" stroke="#27272a" strokeWidth="5" />
          <line x1="138" y1="96" x2="138" y2="134" stroke="#27272a" strokeWidth="5" />
          <circle cx="56" cy="76" r="8" fill="#3f3f46" />
          <line x1="66" y1="80" x2="138" y2="82" stroke="#eab308" strokeWidth="9" strokeLinecap="round" />
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="5 138 82; -85 138 82; 5 138 82"
              dur="2.2s"
              repeatCount="indefinite"
            />
            <line x1="138" y1="82" x2="176" y2="84" stroke="#eab308" strokeWidth="7" strokeLinecap="round" />
            <circle cx="172" cy="84" r="6" fill="#a1a1aa" />
          </g>
        </g>
      )}

      {/* 14. Calves (Standing Calf Raise on block) */}
      {kind === "calves" && (
        <g>
          {/* Step block */}
          <rect x="86" y="120" width="44" height="14" rx="2" fill="#27272a" />
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 6; 0 -14; 0 6"
              dur="2s"
              repeatCount="indefinite"
            />
            <circle cx="110" cy="28" r="8" fill="#3f3f46" />
            <line x1="110" y1="38" x2="110" y2="78" stroke="#52525b" strokeWidth="10" strokeLinecap="round" />
            {/* Highlighted calves */}
            <line x1="110" y1="78" x2="110" y2="118" stroke="#eab308" strokeWidth="8" strokeLinecap="round" />
            {/* Foot on edge */}
            <line x1="100" y1="118" x2="122" y2="118" stroke="#a1a1aa" strokeWidth="5" strokeLinecap="round" />
          </g>
        </g>
      )}
    </svg>
  );
}

export function ExerciseVisualModal({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  if (!exercise) return null;
  const kind = getMovementKind(exercise.id, exercise.muscleGroup);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            {exercise.muscleGroup} · Démonstration
          </span>
          <h3 className="text-base font-black text-white pr-6">
            {exercise.name}
          </h3>
        </div>

        <AnimatedExerciseSvg kind={kind} />

        {exercise.notes && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-300 leading-relaxed">
            <span className="font-bold text-yellow-400">Consigne : </span>
            {exercise.notes}
          </div>
        )}

        {exercise.audioMemoLabel && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            <Volume2 className="h-3.5 w-3.5 text-yellow-400" />
            {exercise.audioMemoLabel}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-xl bg-yellow-500 py-2.5 text-xs font-black uppercase text-zinc-950 hover:bg-yellow-400"
        >
          Compris
        </button>
      </div>
    </div>
  );
}
