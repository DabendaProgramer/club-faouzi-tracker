"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  ChevronDown,
  Clock,
  Info,
  Lock,
  Minus,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
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
import {
  evaluateRankForSet,
  getNextRankProgress,
} from "@/data/performance-chart";
import { RankPill } from "@/components/RankBadge";
import {
  ExerciseVisualModal,
  MuscleMiniBadge,
} from "@/components/ExerciseVisuals";
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
  onGoToMobility?: () => void;
  onAdvanceDay?: () => void;
}

const SET_TYPE_SHORT: Record<SetType, string> = {
  warmup: "Échauf.",
  activation: "Activ.",
  top_set: "Top Set",
  backoff: "Back-off",
  working: "Travail",
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
  onGoToMobility,
  onAdvanceDay,
}: WorkoutTrackerProps) {
  const defaultExId =
    currentDay.exerciseIds[0] ?? exercises[0]?.id ?? "ez-bar-curl";
  const [selectedExId, setSelectedExId] = useState<string>(defaultExId);

  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === selectedExId) ?? exercises[0],
    [exercises, selectedExId]
  );

  // Form state
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

  // Progressive disclosure toggles (keeps UI clean!)
  const [showNotes, setShowNotes] = useState(false);
  const [showVisualModal, setShowVisualModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
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

  const exerciseActiveSets = useMemo(
    () => activeSets.filter((s) => s.exerciseId === selectedExercise?.id),
    [activeSets, selectedExercise?.id]
  );

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

  const rankProgress = useMemo(() => {
    if (!selectedExercise) return null;
    const bestW =
      comparison && comparison.currentBestWeight > 0
        ? comparison.currentBestWeight
        : comparison?.prevBestWeight ?? 0;
    const bestR =
      comparison && comparison.currentBestReps > 0
        ? comparison.currentBestReps
        : comparison?.prevBestReps ?? 0;
    const bestKg = toKg(
      bestW * (selectedExercise.isEachSide ? 2 : 1),
      selectedExercise.defaultUnit
    );
    return getNextRankProgress(
      selectedExercise.id,
      selectedExercise.muscleGroup,
      bestKg,
      bestR
    );
  }, [selectedExercise, comparison]);

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

    if (setType === "top_set" && settings.tier === "pro" && numericWeight > 0) {
      const nextBackoff = calculateBackoffWeight(
        numericWeight,
        0.85,
        settings.roundingStep
      );
      setSetType("backoff");
      setWeight(String(nextBackoff));
    }

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
          label: "Top Set",
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

  const weightStep = unit === "kg" ? 1 : 5;

  return (
    <div className="space-y-5 pb-24">
      {/* Clean Header: Day + Rest Pill + Finish */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {currentDay.dayLabel}
          </p>
          <h2 className="text-xl font-black tracking-tight text-white">
            {currentDay.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              restRunning
                ? (setRestRunning(false), setRestRemaining(0))
                : startRest(settings.defaultRestSeconds)
            }
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              restRunning
                ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            {restRunning
              ? formatRest(restRemaining)
              : `${settings.defaultRestSeconds}s`}
          </button>

          {activeSets.length > 0 && (
            <button
              onClick={onFinishSession}
              className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500 px-3.5 py-1.5 text-xs font-black text-zinc-950 transition hover:bg-yellow-400 active:scale-95"
            >
              <Save className="h-3.5 w-3.5" />
              Terminer ({activeSets.length})
            </button>
          )}
        </div>
      </div>

      {/* Rest Day Notice (clean & minimal) */}
      {currentDay.isRest && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs">
          <span className="text-zinc-300">Jour de récupération</span>
          <div className="flex gap-2">
            {onGoToMobility && (
              <button
                type="button"
                onClick={onGoToMobility}
                className="font-bold text-yellow-400 hover:underline"
              >
                Mobilité
              </button>
            )}
            {onAdvanceDay && (
              <button
                type="button"
                onClick={onAdvanceDay}
                className="font-bold text-zinc-300 hover:text-white"
              >
                Jour suivant →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Day Exercise Chips */}
      {currentDay.exerciseIds.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
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
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-white text-zinc-950"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {ex.name}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Exercise Selector + Compact Context Line */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          {selectedExercise && (
            <MuscleMiniBadge
              muscleGroup={selectedExercise.muscleGroup}
              onClick={() => setShowVisualModal(true)}
            />
          )}
          <div className="relative flex-1">
            <select
              value={selectedExercise?.id ?? ""}
              onChange={(e) => handleSelectExercise(e.target.value)}
              className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 pr-9 text-sm font-bold text-white outline-none focus:border-yellow-500/70"
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} · {ex.muscleGroup}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-500" />
          </div>

          {(selectedExercise?.notes ||
            selectedExercise?.audioMemoLabel ||
            currentDay.preWorkoutNote) && (
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                showNotes
                  ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                  : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white"
              }`}
              aria-label="Notes techniques"
            >
              <Info className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowNewEx(!showNewEx)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white"
            aria-label="Nouvel exercice"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Collapsible Notes */}
        {showNotes && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300 space-y-1">
            {currentDay.preWorkoutNote && (
              <p className="text-yellow-400/90">{currentDay.preWorkoutNote}</p>
            )}
            {selectedExercise?.notes && <p>{selectedExercise.notes}</p>}
            {selectedExercise?.audioMemoLabel && (
              <p className="inline-flex items-center gap-1.5 text-zinc-400">
                <Volume2 className="h-3.5 w-3.5" />
                {selectedExercise.audioMemoLabel}
              </p>
            )}
          </div>
        )}

        {/* Collapsible New Exercise Form */}
        {showNewEx && (
          <form
            onSubmit={handleCreateCustomEx}
            className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5"
          >
            <input
              type="text"
              placeholder="Nom de l'exercice..."
              value={newExName}
              onChange={(e) => setNewExName(e.target.value)}
              className="flex-1 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs text-white outline-none"
            />
            <select
              value={newExMuscle}
              onChange={(e) => setNewExMuscle(e.target.value as MuscleGroup)}
              className="rounded-lg bg-zinc-950 px-2 py-1.5 text-xs text-zinc-300 outline-none"
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
              className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-bold text-zinc-950"
            >
              OK
            </button>
          </form>
        )}

        {/* Single Clean Context Line: Last Session + Rank Target */}
        <div className="space-y-1.5 px-0.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              {comparison?.hasPrevious ? (
                <>
                  Dernière :{" "}
                  <strong className="text-zinc-200">
                    {comparison.prevBestWeight}
                    {comparison.prevUnit} × {comparison.prevBestReps}
                  </strong>
                </>
              ) : (
                "Première séance"
              )}
            </span>
            {rankProgress?.nextRank ? (
              <span className="font-semibold text-yellow-400/90">
                Cible {rankProgress.nextRank} : {rankProgress.targetWeightKg}kg ×{" "}
                {rankProgress.targetReps}
              </span>
            ) : rankProgress?.currentRank ? (
              <RankPill rank={rankProgress.currentRank} />
            ) : null}
          </div>
          {rankProgress && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                style={{ width: `${rankProgress.progressPct}%` }}
                className="h-full rounded-full bg-yellow-500/80 transition-all duration-300"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Clean Log Card */}
      <form
        onSubmit={handleLogSet}
        className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-4 space-y-4"
      >
        {/* Set Type Segmented Bar + 0.85x Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 rounded-xl bg-zinc-950 p-1">
            {(["warmup", "activation", "top_set", "backoff"] as SetType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSetType(type)}
                  className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
                    setType === type
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {SET_TYPE_SHORT[type]}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={handleApplyBackoff}
            title="Calculer Back-off 0.85x"
            className="inline-flex h-8 items-center gap-1 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-2.5 text-[11px] font-bold text-yellow-400 hover:bg-yellow-500/20"
          >
            {settings.tier !== "pro" && <Lock className="h-3 w-3" />}
            <Calculator className="h-3.5 w-3.5" />
            0.85x
          </button>
        </div>

        {/* Clean Weight & Reps Steppers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Poids ({unit})</span>
              {isEachSide && (
                <span className="text-yellow-400/90">/ côté</span>
              )}
            </div>
            <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950">
              <button
                type="button"
                disabled={isEmptyBar}
                onClick={() =>
                  setWeight((p) =>
                    String(Math.max(0, (parseFloat(p) || 0) - weightStep))
                  )
                }
                className="px-2.5 py-3 text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                step="0.5"
                min="0"
                disabled={isEmptyBar}
                value={isEmptyBar ? "0" : weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-transparent text-center text-lg font-black text-white outline-none disabled:opacity-40"
              />
              <button
                type="button"
                disabled={isEmptyBar}
                onClick={() =>
                  setWeight((p) => String((parseFloat(p) || 0) + weightStep))
                }
                className="px-2.5 py-3 text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Répétitions</span>
              {selectedExercise?.minPrReps && setType !== "warmup" && (
                <span className="text-yellow-400/90">
                  Min {selectedExercise.minPrReps}
                </span>
              )}
            </div>
            <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950">
              <button
                type="button"
                onClick={() =>
                  setReps((p) =>
                    String(Math.max(1, (parseInt(p, 10) || 1) - 1))
                  )
                }
                className="px-2.5 py-3 text-zinc-400 hover:text-white"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full bg-transparent text-center text-lg font-black text-white outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setReps((p) => String((parseInt(p, 10) || 1) + 1))
                }
                className="px-2.5 py-3 text-zinc-400 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Secondary Options */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Options ({unit}
            {isEachSide ? " · par côté" : ""}
            {isEmptyBar ? " · barre vide" : ""})
          </button>

          {showOptions && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex rounded-lg bg-zinc-950 p-0.5">
                {(["kg", "lbs"] as WeightUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase ${
                      unit === u
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsEachSide(!isEachSide)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                  isEachSide
                    ? "border-yellow-500/50 text-yellow-300"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                Par côté
              </button>
              <button
                type="button"
                onClick={() => setIsEmptyBar(!isEmptyBar)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                  isEmptyBar
                    ? "border-yellow-500/50 text-yellow-300"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                Barre vide
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-black text-zinc-950 transition hover:bg-yellow-400 active:scale-[0.99]"
        >
          Valider la série
        </button>
      </form>

      {/* Subtle Suggested Sets Strip */}
      {selectedExercise && selectedExercise.defaultSets.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Modèles :
          </span>
          {selectedExercise.defaultSets.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                setSetType(tpl.setType);
                setWeight(String(tpl.targetWeight ?? 0));
                setReps(String(tpl.targetReps ?? 10));
                setUnit(tpl.unit);
                setIsEmptyBar(Boolean(tpl.isEmptyBar));
                setIsEachSide(Boolean(tpl.isEachSide));
              }}
              className="shrink-0 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-1 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-white"
            >
              {tpl.isEmptyBar
                ? "Barre vide"
                : `${tpl.targetWeight ?? 0}${tpl.unit}`}{" "}
              × {tpl.targetReps ?? "?"}
            </button>
          ))}
        </div>
      )}

      {/* Minimal Logged Sets List */}
      {exerciseActiveSets.length > 0 && (
        <div className="divide-y divide-zinc-800/70 rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
          {exerciseActiveSets.map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500">
                  #{idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {s.isEmptyBar
                        ? "Barre vide"
                        : `${s.weight}${s.unit}${
                            s.isEachSide ? " /côté" : ""
                          }`}{" "}
                      × {s.reps}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {SET_TYPE_LABELS_CLEAN(s.setType)}
                    </span>
                    {s.unlockedRank && <RankPill rank={s.unlockedRank} />}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveSet(s.id)}
                className="p-1 text-zinc-600 hover:text-rose-400"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ExerciseVisualModal
        exercise={showVisualModal ? selectedExercise ?? null : null}
        onClose={() => setShowVisualModal(false)}
      />
    </div>
  );
}

function SET_TYPE_LABELS_CLEAN(type: SetType): string {
  return SET_TYPE_SHORT[type];
}
