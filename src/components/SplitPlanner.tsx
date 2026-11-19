"use client";

import React, { useState } from "react";
import {
  Calendar,
  Check,
  Edit3,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Exercise, SplitDay, UserSettings } from "@/types/workout";

interface SplitPlannerProps {
  settings: UserSettings;
  splitDays: SplitDay[];
  customSplitDays: SplitDay[];
  exercises: Exercise[];
  onSwitchMode: (mode: "11-day" | "custom") => void;
  onSelectCycleDay: (dayIndex: number) => void;
  onUpdateCustomDays: (days: SplitDay[]) => void;
  onUnlockProClick: () => void;
  onGoToWorkout: () => void;
}

export function SplitPlanner({
  settings,
  splitDays,
  customSplitDays,
  exercises,
  onSwitchMode,
  onSelectCycleDay,
  onUpdateCustomDays,
  onUnlockProClick,
  onGoToWorkout,
}: SplitPlannerProps) {
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [newDayTitle, setNewDayTitle] = useState("");

  const activeList =
    settings.splitMode === "11-day" ? splitDays : customSplitDays;

  const handleToggleMode = (mode: "11-day" | "custom") => {
    if (mode === "11-day" && settings.tier !== "pro") {
      onUnlockProClick();
      return;
    }
    onSwitchMode(mode);
  };

  const handleToggleExerciseInDay = (dayIdx: number, exId: string) => {
    const updated = customSplitDays.map((d) => {
      if (d.dayIndex !== dayIdx) return d;
      const exists = d.exerciseIds.includes(exId);
      return {
        ...d,
        isRest: false,
        exerciseIds: exists
          ? d.exerciseIds.filter((id) => id !== exId)
          : [...d.exerciseIds, exId],
      };
    });
    onUpdateCustomDays(updated);
  };

  const handleAddCustomDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayTitle.trim()) return;
    const nextIdx =
      customSplitDays.length > 0
        ? Math.max(...customSplitDays.map((d) => d.dayIndex)) + 1
        : 1;
    const newDay: SplitDay = {
      dayIndex: nextIdx,
      dayLabel: `Jour ${nextIdx}`,
      title: newDayTitle.trim(),
      isRest: false,
      exerciseIds: [],
    };
    onUpdateCustomDays([...customSplitDays, newDay]);
    setNewDayTitle("");
    setEditingDayIndex(nextIdx);
  };

  const handleDeleteCustomDay = (dayIdx: number) => {
    if (customSplitDays.length <= 1) return;
    onUpdateCustomDays(customSplitDays.filter((d) => d.dayIndex !== dayIdx));
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Mode Switcher */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-white">
          <Calendar className="h-4 w-4 text-yellow-400" />
          Choix du Programme
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleToggleMode("11-day")}
            className={`rounded-xl border p-3 text-left transition ${
              settings.splitMode === "11-day"
                ? "border-yellow-500 bg-yellow-500/15"
                : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-yellow-400">
                Cycle 11 Jours
              </span>
              {settings.tier !== "pro" ? (
                <Lock className="h-3.5 w-3.5 text-yellow-400" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              )}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Programme optimisé récupération & gains musculaires.
            </p>
          </button>

          <button
            onClick={() => handleToggleMode("custom")}
            className={`rounded-xl border p-3 text-left transition ${
              settings.splitMode === "custom"
                ? "border-yellow-500 bg-yellow-500/15"
                : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">
                Planning Perso
              </span>
              <Edit3 className="h-3.5 w-3.5 text-zinc-400" />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Crée tes propres jours et choisis tes exercices.
            </p>
          </button>
        </div>
      </div>

      {/* Add day form in Custom mode */}
      {settings.splitMode === "custom" && (
        <form
          onSubmit={handleAddCustomDay}
          className="flex gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"
        >
          <input
            type="text"
            placeholder="Nouveau jour (ex: Push, Pull, Full Body...)"
            value={newDayTitle}
            onChange={(e) => setNewDayTitle(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-yellow-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-yellow-500 px-3.5 py-2 text-xs font-bold text-zinc-950"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </form>
      )}

      {/* Split Days List */}
      <div className="space-y-2.5">
        {activeList.map((day) => {
          const isCurrent = day.dayIndex === settings.currentCycleDay;
          const isEditing =
            settings.splitMode === "custom" && editingDayIndex === day.dayIndex;

          return (
            <div
              key={day.dayIndex}
              className={`rounded-2xl border p-3.5 transition ${
                isCurrent
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  onClick={() => {
                    onSelectCycleDay(day.dayIndex);
                    if (!day.isRest) onGoToWorkout();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400">
                      {day.dayLabel}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-950">
                        Aujourd&apos;hui
                      </span>
                    )}
                  </div>
                  <h3
                    className={`text-sm font-extrabold ${
                      day.isRest ? "text-zinc-400" : "text-white"
                    }`}
                  >
                    {day.title}
                  </h3>
                  {!day.isRest && day.exerciseIds.length > 0 && (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {day.exerciseIds
                        .map(
                          (id) =>
                            exercises.find((e) => e.id === id)?.name ?? id
                        )
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {settings.splitMode === "custom" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingDayIndex(isEditing ? null : day.dayIndex)
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-zinc-300 hover:text-yellow-400"
                        aria-label="Modifier les exercices"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomDay(day.dayIndex)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-500 hover:text-rose-400"
                        aria-label="Supprimer le jour"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCycleDay(day.dayIndex);
                      if (!day.isRest) onGoToWorkout();
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                      isCurrent
                        ? "bg-yellow-500 text-zinc-950"
                        : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-yellow-500/50"
                    }`}
                  >
                    {day.isRest ? "Activer" : "Lancer"}
                  </button>
                </div>
              </div>

              {/* Exercise picker when editing a custom day */}
              {isEditing && (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <p className="mb-2 text-[11px] font-semibold text-zinc-400">
                    Sélectionne les exercices pour ce jour :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercises.map((ex) => {
                      const active = day.exerciseIds.includes(ex.id);
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() =>
                            handleToggleExerciseInDay(day.dayIndex, ex.id)
                          }
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            active
                              ? "border-yellow-500 bg-yellow-500/20 text-yellow-300"
                              : "border-zinc-800 bg-zinc-950 text-zinc-400"
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                          {ex.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
