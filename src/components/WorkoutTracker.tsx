"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  TrendingUp,
  Volume2,
} from "lucide-react";
import {
  Exercise,
  FaouziRank,
  LoggedSet,
  MuscleGroup,
  SetType,
  SplitDay,
  UserSettings,
  WeightUnit,
  WorkoutSession,
} from "@/types/workout";
import {
  calculateBackoffWeight,
  compareExerciseWithHistory,
  toKg,
} from "@/lib/workout-engine";
import { evaluateRankForSet } from "@/data/performance-chart";
import { RankPill } from "@/components/RankBadge";
import { playTimerBeep } from "@/lib/sound";

interface WorkoutTrackerProps {
  exercises: Exercise[];
  currentDay: SplitDay;
  history: WorkoutSession[];
  settings: UserSettings;
  activeSets: LoggedSet[];
  onAddSet: (set: LoggedSet) => void;
  onRemoveSet: (setId: string) => void;
  onFinishSession: () => void;
  onAddCustomExercise: (ex: Exercise) => void;
  onUnlockProClick: () => void;
}

const SET_TYPE_LABELS: Record<SetType, { label: string; color: string }> = {
  warmup: {
    label: "Échauffement",
    color: "bg-zinc-800 text-zinc-300 border-zinc-700",
  },
  activation: {
    label: "Activation",
    color: "bg-sky-950/60 text-sky-300 border-sky-700/50",
  },
  top_set: {
    label: "Top Set (Max Reps)",
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/50",
  },
  backoff: {
    label: "Back-off (0.85x)",
    color: "bg-amber-950/60 text-amber-300 border-amber-600/50",
  },
  working: {
    label: "Série de travail",
    color: "bg-emerald-950/50 text-emerald-300 border-emerald-700/50",
  },
};

export function WorkoutTracker({
  exercises,
  currentDay,
  history,
  settings,
  activeSets,
  onAddSet,
  onRemoveSet,
  onFinishSession,
  onAddCustomExercise,
  onUnlockProClick,
}: WorkoutTrackerProps) {
  const defaultExId =
    currentDay.exerciseIds[0] ?? exercises[0]?.id ?? "ez-bar-curl";
  const [selectedExId, setSelectedExId] = useState<string>(defaultExId);

  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === selectedExId) ?? exercises[0],
    [exercises, selectedExId]
  );

  // Form state for quick set entry
  const [setType, setSetType] = useState<SetType>("top_set");
  const [weight, setWeight] = useState<string>("10");
  const [reps, setReps] = useState<string>("10");
  const [unit, setUnit] = useState<WeightUnit>(
    selectedExercise?.defaultUnit ?? settings.preferredUnit
  );
  const [isEachSide, setIsEachSide] = useState<boolean>(
    Boolean(selectedExercise?.isEachSide)
  );
  const [isEmptyBar, setIsEmptyBar] = useState<boolean>(false);

  // Custom exercise modal state
  const [showNewEx, setShowNewEx] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>("Biceps");

  // Rest timer state
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [restRunning, setRestRunning] = useState<boolean>(false);

  const handleSelectExercise = (exId: string) => {
    setSelectedExId(exId);
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;
    setUnit(ex.defaultUnit);
    setIsEachSide(Boolean(ex.isEachSide));
    const topTemplate =
      ex.defaultSets.find((s) => s.setType === "top_set") ?? ex.defaultSets[0];
    if (topTemplate) {
      setSetType(topTemplate.setType);
      setWeight(String(topTemplate.targetWeight ?? 10));
      setReps(String(topTemplate.targetReps ?? 10));
      setIsEmptyBar(Boolean(topTemplate.isEmptyBar));
    }
  };

  // Rest timer countdown
  useEffect(() => {
    if (!restRunning) return;
    const timer = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          setRestRunning(false);
          playTimerBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restRunning]);

  const startRest = (seconds: number) => {
    setRestRemaining(seconds);
    setRestRunning(true);
  };

  // Current exercise sets in this session
  const exerciseActiveSets = useMemo(
    () => activeSets.filter((s) => s.exerciseId === selectedExercise?.id),
    [activeSets, selectedExercise?.id]
  );

  // Latest top set for this exercise in the current session (for 0.85x auto-calc)
  const latestTopSet = useMemo(() => {
    const tops = exerciseActiveSets.filter((s) => s.setType === "top_set");
    return tops[tops.length - 1] ?? null;
  }, [exerciseActiveSets]);

  const comparison = useMemo(
    () =>
      selectedExercise
        ? compareExerciseWithHistory(selectedExercise.id, activeSets, history)
        : null,
    [selectedExercise, activeSets, history]
  );

  const handleApplyBackoff = () => {
    if (settings.tier !== "pro") {
      onUnlockProClick();
      return;
    }
    const baseWeight = latestTopSet
      ? latestTopSet.weight
      : parseFloat(weight) || 0;
    const baseReps = latestTopSet ? latestTopSet.reps : parseInt(reps, 10) || 0;
    const backoffW = calculateBackoffWeight(
      baseWeight,
      0.85,
      settings.roundingStep
    );
    setSetType("backoff");
    setWeight(String(backoffW));
    if (baseReps > 0) setReps(String(baseReps));
    setIsEmptyBar(false);
  };

  const handleLoadTemplate = (
    tplWeight: number,
    tplReps: number,
    tplType: SetType,
    tplUnit: WeightUnit,
    tplEmptyBar?: boolean,
    tplEachSide?: boolean
  ) => {
    setSetType(tplType);
    setWeight(String(tplWeight));
    setReps(String(tplReps));
    setUnit(tplUnit);
    setIsEmptyBar(Boolean(tplEmptyBar));
    setIsEachSide(Boolean(tplEachSide));
  };

  const handleLogSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExercise) return;

    const numericWeight = isEmptyBar ? 0 : Math.max(0, parseFloat(weight) || 0);
    const numericReps = Math.max(1, parseInt(reps, 10) || 1);

    let unlockedRank: FaouziRank | null = null;
    if (setType !== "warmup" && setType !== "activation") {
      const effectiveKg = toKg(
        numericWeight * (isEachSide ? 2 : 1),
        unit
      );
      unlockedRank = evaluateRankForSet(
        selectedExercise.id,
        selectedExercise.muscleGroup,
        effectiveKg,
        numericReps
      );
    }

    const newSet: LoggedSet = {
      id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      muscleGroup: selectedExercise.muscleGroup,
      setType,
      weight: numericWeight,
      unit,
      isEmptyBar,
      isEachSide,
      reps: numericReps,
      minPrReps: selectedExercise.minPrReps,
      completedAt: new Date().toISOString(),
      unlockedRank,
    };

    onAddSet(newSet);

    // Auto-prepare next set if user just logged a top_set and has Pro
    if (setType === "top_set" && settings.tier === "pro" && numericWeight > 0) {
      const nextBackoff = calculateBackoffWeight(
        numericWeight,
        0.85,
        settings.roundingStep
      );
      setSetType("backoff");
      setWeight(String(nextBackoff));
    }

    // Start rest timer automatically for working sets
    if (setType !== "warmup") {
      startRest(settings.defaultRestSeconds);
    }
  };

  const handleCreateCustomEx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;
    const id = `custom-${Date.now()}`;
    const customEx: Exercise = {
      id,
      name: newExName.trim(),
      muscleGroup: newExMuscle,
      defaultUnit: settings.preferredUnit,
      defaultSets: [
        {
          id: `${id}-t1`,
          setType: "top_set",
          label: "Travail 1 (Max Reps)",
          targetWeight: 20,
          targetReps: 10,
          unit: settings.preferredUnit,
        },
      ],
    };
    onAddCustomExercise(customEx);
    setSelectedExId(id);
    setNewExName("");
    setShowNewEx(false);
  };

  const formatRest = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Today's Split Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-yellow-400">
              {settings.splitMode === "11-day"
                ? `Cycle 11 Jours · ${currentDay.dayLabel}`
                : `Planning Perso · ${currentDay.dayLabel}`}
            </span>
            <h2 className="text-lg font-extrabold text-white">
              {currentDay.title}
            </h2>
          </div>
          {activeSets.length > 0 && (
            <button
              onClick={onFinishSession}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-95"
            >
              <Save className="h-4 w-4" />
              Terminer ({activeSets.length})
            </button>
          )}
        </div>

        {currentDay.preWorkoutNote && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{currentDay.preWorkoutNote}</span>
          </div>
        )}

        {/* Quick Pills for today's exercises */}
        {currentDay.exerciseIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {currentDay.exerciseIds.map((exId) => {
              const ex = exercises.find((e) => e.id === exId);
              if (!ex) return null;
              const isSelected = ex.id === selectedExercise?.id;
              const count = activeSets.filter(
                (s) => s.exerciseId === ex.id
              ).length;
              return (
                <button
                  key={ex.id}
                  onClick={() => handleSelectExercise(ex.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {ex.name}
                  {count > 0 && (
                    <span className="ml-1.5 rounded-full bg-yellow-500 px-1.5 py-0.2 text-[10px] text-zinc-950">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Exercise Selector + Custom Exercise */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Exercice sélectionné
          </label>
          <button
            onClick={() => setShowNewEx(!showNewEx)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-400 hover:text-yellow-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvel exo
          </button>
        </div>

        {showNewEx && (
          <form
            onSubmit={handleCreateCustomEx}
            className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3"
          >
            <input
              type="text"
              placeholder="Nom de l'exercice (ex: Curl Pupitre)"
              value={newExName}
              onChange={(e) => setNewExName(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
            />
            <div className="flex gap-2">
              <select
                value={newExMuscle}
                onChange={(e) =>
                  setNewExMuscle(e.target.value as MuscleGroup)
                }
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500"
              >
                {(
                  [
                    "Biceps",
                    "Épaules",
                    "Triceps",
                    "Dos",
                    "Chest",
                    "Legs",
                  ] as MuscleGroup[]
                ).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-yellow-500 px-4 py-2 text-xs font-bold text-zinc-950"
              >
                Ajouter
              </button>
            </div>
          </form>
        )}

        <div className="relative">
          <select
            value={selectedExercise?.id ?? ""}
            onChange={(e) => handleSelectExercise(e.target.value)}
            className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 pr-10 text-sm font-bold text-white outline-none focus:border-yellow-500"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                [{ex.muscleGroup}] {ex.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-zinc-400" />
        </div>

        {/* Pinned Technical Notes & Audio Memo */}
        {(selectedExercise?.notes || selectedExercise?.audioMemoLabel) && (
          <div className="space-y-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs">
            {selectedExercise.notes && (
              <p className="text-zinc-300 leading-relaxed">
                <span className="font-bold text-yellow-400">Note : </span>
                {selectedExercise.notes}
              </p>
            )}
            {selectedExercise.audioMemoLabel && (
              <div className="inline-flex items-center gap-1.5 text-sky-400 font-medium">
                <Volume2 className="h-3.5 w-3.5" />
                {selectedExercise.audioMemoLabel}
              </div>
            )}
          </div>
        )}

        {/* Quick Comparison vs Last Session */}
        {comparison && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">
            {comparison.hasPrevious ? (
              <>
                <span className="text-zinc-400">
                  Dernière séance :{" "}
                  <strong className="text-zinc-200">
                    {comparison.prevBestWeight} {comparison.prevUnit} ×{" "}
                    {comparison.prevBestReps}
                  </strong>
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-bold ${
                    comparison.delta1RM >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {comparison.currentBestReps > 0
                    ? `${comparison.deltaWeight >= 0 ? "+" : ""}${
                        comparison.deltaWeight
                      }${unit} · ${comparison.deltaReps >= 0 ? "+" : ""}${
                        comparison.deltaReps
                      } reps`
                    : "Prêt à battre"}
                </span>
              </>
            ) : (
              <span className="text-zinc-400">
                Première séance enregistrée sur cet exercice
              </span>
            )}
          </div>
        )}
      </div>

      {/* Preset Set Templates for Quick Tap */}
      {selectedExercise && selectedExercise.defaultSets.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Séries suggérées (clic pour charger)
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedExercise.defaultSets.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() =>
                  handleLoadTemplate(
                    tpl.targetWeight ?? 0,
                    tpl.targetReps ?? 10,
                    tpl.setType,
                    tpl.unit,
                    tpl.isEmptyBar,
                    tpl.isEachSide
                  )
                }
                className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left transition hover:border-yellow-500/60 active:scale-95"
              >
                <div className="text-[10px] font-bold uppercase text-yellow-400">
                  {tpl.label}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-white">
                  {tpl.isEmptyBar
                    ? "Barre vide"
                    : `${tpl.targetWeight ?? 0}${tpl.unit}${
                        tpl.isEachSide ? "/côté" : ""
                      }`}{" "}
                  × {tpl.targetReps ?? "?"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log Set Form */}
      <form
        onSubmit={handleLogSet}
        className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-4 space-y-4 shadow-lg shadow-black/40"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white">
            <Dumbbell className="h-4 w-4 text-yellow-400" />
            Ajouter une série
          </span>
          <button
            type="button"
            onClick={handleApplyBackoff}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20"
          >
            {settings.tier !== "pro" && <Lock className="h-3 w-3" />}
            <Calculator className="h-3.5 w-3.5" />
            Calculer Back-off 0.85x
          </button>
        </div>

        {/* Set Type Pills */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {(["warmup", "activation", "top_set", "backoff"] as SetType[]).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSetType(type)}
                className={`rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
                  setType === type
                    ? SET_TYPE_LABELS[type].color + " ring-1 ring-yellow-500/40"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400"
                }`}
              >
                {SET_TYPE_LABELS[type].label}
              </button>
            )
          )}
        </div>

        {/* Weight & Reps Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Poids ({unit})
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              disabled={isEmptyBar}
              value={isEmptyBar ? "0" : weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-lg font-extrabold text-white outline-none focus:border-yellow-500 disabled:opacity-40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Répétitions
              {selectedExercise?.minPrReps && setType !== "warmup" && (
                <span className="ml-1 text-yellow-400">
                  (Min PR: {selectedExercise.minPrReps})
                </span>
              )}
            </label>
            <input
              type="number"
              min="1"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-lg font-extrabold text-white outline-none focus:border-yellow-500"
            />
          </div>
        </div>

        {/* Options Row: Unit, Each side, Empty bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {(["kg", "lbs"] as WeightUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`rounded-md px-2.5 py-1 font-bold uppercase ${
                  unit === u
                    ? "bg-yellow-500 text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsEachSide(!isEachSide)}
            className={`rounded-lg border px-2.5 py-1.5 font-semibold ${
              isEachSide
                ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400"
            }`}
          >
            Par côté (Each side)
          </button>

          <button
            type="button"
            onClick={() => setIsEmptyBar(!isEmptyBar)}
            className={`rounded-lg border px-2.5 py-1.5 font-semibold ${
              isEmptyBar
                ? "border-sky-500/60 bg-sky-500/15 text-sky-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400"
            }`}
          >
            Barre vide
          </button>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3.5 text-sm font-black uppercase tracking-wide text-zinc-950 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-400 active:scale-[0.98]"
        >
          <CheckCircle2 className="h-5 w-5" />
          Valider la série
        </button>
      </form>

      {/* Rest Timer Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock
            className={`h-4 w-4 ${
              restRunning ? "animate-pulse text-yellow-400" : "text-zinc-400"
            }`}
          />
          <span className="text-xs font-semibold text-zinc-300">
            Repos :{" "}
            <span className="font-mono text-sm font-bold text-white">
              {restRunning ? formatRest(restRemaining) : "Prêt"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {[60, 90, 120, 180].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => startRest(sec)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] font-bold text-zinc-300 hover:border-yellow-500/50 hover:text-yellow-300"
            >
              {sec}s
            </button>
          ))}
          {restRunning && (
            <button
              type="button"
              onClick={() => {
                setRestRunning(false);
                setRestRemaining(0);
              }}
              className="rounded-lg bg-zinc-800 p-1 text-zinc-300 hover:text-white"
              aria-label="Réinitialiser"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Logged Sets for this exercise */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Séries enregistrées ({exerciseActiveSets.length})
          </h3>
          {exerciseActiveSets.some((s) => s.setType === "top_set") && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-yellow-400">
              <Flame className="h-3.5 w-3.5" />
              Top Set validé
            </span>
          )}
        </div>

        {exerciseActiveSets.length === 0 ? (
          <p className="py-4 text-center text-xs text-zinc-500">
            Aucune série validée pour cet exercice dans cette séance.
          </p>
        ) : (
          <div className="space-y-2">
            {exerciseActiveSets.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-300">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-white">
                        {s.isEmptyBar
                          ? "Barre vide"
                          : `${s.weight} ${s.unit}${
                              s.isEachSide ? " / côté" : ""
                            }`}{" "}
                        × {s.reps} reps
                      </span>
                      {s.unlockedRank && <RankPill rank={s.unlockedRank} />}
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {SET_TYPE_LABELS[s.setType].label}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSet(s.id)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                  aria-label="Supprimer la série"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
