"use client";

import React from "react";
import { Award, Crown, Shield, Sparkles, X } from "lucide-react";
import { FaouziRank, UnlockedBadge } from "@/types/workout";
import { RANK_STYLES } from "@/data/performance-chart";

export function RankPill({
  rank,
  size = "sm",
}: {
  rank: FaouziRank;
  size?: "sm" | "md";
}) {
  const style = RANK_STYLES[rank];
  const Icon =
    rank === "Master" || rank === "Diamond" || rank === "Gold" ? Crown : Shield;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold tracking-wider uppercase ${style.bg} ${style.border} ${style.color} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {style.label}
    </span>
  );
}

export function BadgeUnlockModal({
  badge,
  onClose,
}: {
  badge: UnlockedBadge | null;
  onClose: () => void;
}) {
  if (!badge) return null;
  const style = RANK_STYLES[badge.rank];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-sm rounded-2xl border-2 ${style.border} bg-zinc-950 p-6 text-center shadow-2xl ${style.glow}`}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/10">
          <Award className={`h-9 w-9 ${style.color}`} />
        </div>

        <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-yellow-400">
          <Sparkles className="h-3.5 w-3.5" />
          Objectif Club Faouzi Atteint !
        </div>

        <h3 className={`text-2xl font-black tracking-tight ${style.color}`}>
          RANG {style.label}
        </h3>

        <p className="mt-2 text-sm text-zinc-300">
          Tu as validé <span className="font-bold text-white">{badge.exerciseName}</span>{" "}
          ({badge.muscleGroup}) avec{" "}
          <span className="font-bold text-yellow-400">
            {badge.weightKg} kg × {badge.reps} reps
          </span>
          .
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-yellow-500 py-3 text-sm font-bold text-zinc-950 transition hover:bg-yellow-400 active:scale-[0.98]"
        >
          Continuer la séance
        </button>
      </div>
    </div>
  );
}
