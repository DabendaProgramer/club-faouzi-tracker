"use client";

import React, { useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Crown,
  Flame,
  History,
  Lock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Exercise,
  LoggedSet,
  UnlockedBadge,
  UserSettings,
  WorkoutSession,
} from "@/types/workout";
import { compareExerciseWithHistory } from "@/lib/workout-engine";
import {
  FAOUZI_PERFORMANCE_CHART,
  RANK_STYLES,
} from "@/data/performance-chart";
import { RankPill } from "@/components/RankBadge";

interface DashboardViewProps {
  exercises: Exercise[];
  history: WorkoutSession[];
  activeSets: LoggedSet[];
  badges: UnlockedBadge[];
  settings: UserSettings;
  onUnlockProClick: () => void;
}

export function DashboardView({
  exercises,
  history,
  activeSets,
  badges,
  settings,
  onUnlockProClick,
}: DashboardViewProps) {
  const [selectedMuscleFilter, setSelectedMuscleFilter] =
    useState<string>("Tous");

  // Build comparison cards for every exercise that has either active sets or history
  const exerciseComparisons = useMemo(() => {
    const sortedHistory = [...history].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return exercises
      .map((ex) => {
        const hasActive = activeSets.some((s) => s.exerciseId === ex.id);
        const targetSets = hasActive
          ? activeSets
          : sortedHistory.find((sess) =>
              sess.sets.some((s) => s.exerciseId === ex.id)
            )?.sets ?? [];

        if (targetSets.length === 0) return null;

        const prevHistory = hasActive
          ? sortedHistory
          : sortedHistory.slice(
              sortedHistory.findIndex((sess) =>
                sess.sets.some((s) => s.exerciseId === ex.id)
              ) + 1
            );

        const comp = compareExerciseWithHistory(ex.id, targetSets, prevHistory);
        return {
          exercise: ex,
          isLive: hasActive,
          comp,
        };
      })
      .filter(Boolean);
  }, [exercises, history, activeSets]);

  const filteredChart = useMemo(() => {
    if (selectedMuscleFilter === "Tous") return FAOUZI_PERFORMANCE_CHART;
    return FAOUZI_PERFORMANCE_CHART.filter(
      (r) => r.muscleGroup === selectedMuscleFilter
    );
  }, [selectedMuscleFilter]);

  return (
    <div className="space-y-5 pb-24">
      {/* Top KPI Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-400">
            <History className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-white">{history.length}</div>
          <div className="text-[11px] font-medium text-zinc-400">Séances</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-white">
            {exerciseComparisons.filter((c) => c && c.comp.isPR).length}
          </div>
          <div className="text-[11px] font-medium text-zinc-400">PRs actifs</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-400">
            <Crown className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-white">{badges.length}</div>
          <div className="text-[11px] font-medium text-zinc-400">Badges</div>
        </div>
      </div>

      {/* Comparison vs Last Session */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-white">
            <BarChart3 className="h-4 w-4 text-yellow-400" />
            Comparaison vs Dernière Séance
          </h2>
          <span className="text-[11px] text-zinc-400">1RM & Volume</span>
        </div>

        {exerciseComparisons.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-500">
            Valide tes premières séries dans l&apos;onglet Séance pour voir ta
            progression ici.
          </p>
        ) : (
          <div className="space-y-2.5">
            {exerciseComparisons.map((item) => {
              if (!item) return null;
              const { exercise, isLive, comp } = item;
              const positive = comp.delta1RM >= 0;

              return (
                <div
                  key={exercise.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {exercise.name}
                        </span>
                        {isLive && (
                          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                            En cours
                          </span>
                        )}
                        {comp.isPR && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <Flame className="h-3 w-3" /> PR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {exercise.muscleGroup} · Top :{" "}
                        <strong className="text-zinc-200">
                          {comp.currentBestWeight} {exercise.defaultUnit} ×{" "}
                          {comp.currentBestReps}
                        </strong>{" "}
                        (1RM est. {comp.current1RM}kg)
                      </p>
                    </div>

                    {comp.hasPrevious ? (
                      <div className="text-right">
                        <div
                          className={`inline-flex items-center gap-1 text-xs font-extrabold ${
                            positive ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {positive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {comp.delta1RM >= 0 ? "+" : ""}
                          {comp.delta1RM} kg 1RM
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Vol : {comp.deltaVolumePct >= 0 ? "+" : ""}
                          {comp.deltaVolumePct}%
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-zinc-500">
                        Référence
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Club Faouzi Badges Unlocked */}
      <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-yellow-400">
            <Award className="h-4 w-4" />
            Mes Badges Club Faouzi
          </h2>
          {settings.tier !== "pro" && (
            <button
              onClick={onUnlockProClick}
              className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[10px] font-bold text-yellow-300"
            >
              <Lock className="h-3 w-3" /> Pro
            </button>
          )}
        </div>

        {badges.length === 0 ? (
          <p className="py-3 text-center text-xs text-zinc-400">
            Atteins un palier du Performance Chart en validant une série de
            travail pour débloquer ton premier badge !
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"
              >
                <div>
                  <div className="text-xs font-bold text-white">
                    {b.exerciseName}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {b.weightKg} kg × {b.reps} reps
                  </div>
                </div>
                <RankPill rank={b.rank} size="md" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Club Faouzi Men's Performance Chart Reference */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-white">
            Club Faouzi Performance Chart
          </h2>
          <div className="flex gap-1 overflow-x-auto">
            {["Tous", "Dos", "Chest", "Épaules", "Biceps", "Legs"].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMuscleFilter(m)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  selectedMuscleFilter === m
                    ? "bg-yellow-500 text-zinc-950"
                    : "bg-zinc-950 text-zinc-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredChart.map((rule) => (
            <div
              key={rule.exerciseKey}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  {rule.displayName}
                </span>
                <span className="text-[10px] font-semibold uppercase text-zinc-500">
                  {rule.muscleGroup}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {rule.thresholds.map((t) => {
                  const style = RANK_STYLES[t.rank];
                  return (
                    <div
                      key={t.rank}
                      className={`rounded-lg border ${style.border} ${style.bg} p-1.5 text-center`}
                    >
                      <div className={`text-[9px] font-black ${style.color}`}>
                        {style.label}
                      </div>
                      <div className="text-[11px] font-bold text-white">
                        {t.weightKg}kg×{t.reps}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
