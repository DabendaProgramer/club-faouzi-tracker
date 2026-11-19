"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coffee,
  Flame,
  Moon,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { CoachingCheckIn } from "@/types/workout";

export function computeReadinessScore(params: {
  sleepQuality: number;
  hydrated: boolean;
  preWorkoutMeal: CoachingCheckIn["preWorkoutMeal"];
  stress: number;
  energy: number;
  motivation: number;
}): number {
  const sleepPart = (params.sleepQuality / 10) * 30;
  const energyPart = (params.energy / 10) * 25;
  const motivPart = (params.motivation / 10) * 20;
  const stressPart = ((11 - params.stress) / 10) * 15;
  const hydroBonus = params.hydrated ? 5 : 0;
  const mealBonus =
    params.preWorkoutMeal === "breakfast_and_pre"
      ? 5
      : params.preWorkoutMeal === "breakfast_only"
      ? 3
      : 0;
  return Math.min(
    100,
    Math.max(
      15,
      Math.round(
        sleepPart + energyPart + motivPart + stressPart + hydroBonus + mealBonus
      )
    )
  );
}

interface PreWorkoutCheckInModalProps {
  open: boolean;
  fullName: string;
  muscleGroup: string;
  existingCheckIn?: CoachingCheckIn | null;
  onClose: () => void;
  onSave: (checkIn: CoachingCheckIn) => void;
}

const TOTAL_POPUPS = 7;

export function PreWorkoutCheckInModal({
  open,
  fullName,
  muscleGroup,
  existingCheckIn,
  onClose,
  onSave,
}: PreWorkoutCheckInModalProps) {
  const [step, setStep] = useState<number>(1);

  const [sleepStart, setSleepStart] = useState(
    existingCheckIn?.sleepStart ?? "23:30"
  );
  const [sleepEnd, setSleepEnd] = useState(
    existingCheckIn?.sleepEnd ?? "07:30"
  );
  const [sleepQuality, setSleepQuality] = useState(
    existingCheckIn?.sleepQuality ?? 8
  );
  const [sleepDisruptors, setSleepDisruptors] = useState<string[]>(
    existingCheckIn?.sleepDisruptors ?? []
  );

  const [preWorkoutMeal, setPreWorkoutMeal] = useState<
    CoachingCheckIn["preWorkoutMeal"]
  >(existingCheckIn?.preWorkoutMeal ?? "breakfast_and_pre");
  const [hydrated, setHydrated] = useState(existingCheckIn?.hydrated ?? true);

  const [caffeinePre, setCaffeinePre] = useState(
    existingCheckIn?.caffeinePre ?? false
  );
  const [caffeineTime, setCaffeineTime] = useState(
    existingCheckIn?.caffeineTime ?? "17:00"
  );
  const [caffeineEarlier, setCaffeineEarlier] = useState(
    existingCheckIn?.caffeineEarlier ?? false
  );
  const [caffeineDayBefore, setCaffeineDayBefore] = useState(
    existingCheckIn?.caffeineDayBefore ?? false
  );

  const [stress, setStress] = useState(existingCheckIn?.stress ?? 3);
  const [energy, setEnergy] = useState(existingCheckIn?.energy ?? 9);
  const [motivation, setMotivation] = useState(
    existingCheckIn?.motivation ?? 9
  );

  if (!open) return null;

  const toggleDisruptor = (tag: string) => {
    setSleepDisruptors((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const finishWithValues = (overrides?: Partial<CoachingCheckIn>) => {
    const finalStress = overrides?.stress ?? stress;
    const finalEnergy = overrides?.energy ?? energy;
    const finalMotivation = overrides?.motivation ?? motivation;
    const score = computeReadinessScore({
      sleepQuality,
      hydrated,
      preWorkoutMeal,
      stress: finalStress,
      energy: finalEnergy,
      motivation: finalMotivation,
    });

    const checkIn: CoachingCheckIn = {
      id: existingCheckIn?.id ?? `chk-${crypto.randomUUID()}`,
      date: existingCheckIn?.date ?? new Date().toISOString(),
      fullName,
      muscleGroup,
      sleepStart,
      sleepEnd,
      sleepQuality,
      sleepDisruptors,
      preWorkoutMeal,
      hydrated,
      caffeinePre,
      caffeineTime: caffeinePre ? caffeineTime : undefined,
      caffeineEarlier,
      caffeineDayBefore,
      stress: finalStress,
      energy: finalEnergy,
      motivation: finalMotivation,
      readinessScore: score,
    };
    onSave(checkIn);
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-5">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                aria-label="Précédent"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">
              {muscleGroup} · {step}/{TOTAL_POPUPS}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              onClose();
            }}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thin Progress Bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            style={{ width: `${Math.round((step / TOTAL_POPUPS) * 100)}%` }}
            className="h-full rounded-full bg-yellow-500 transition-all duration-200"
          />
        </div>

        {/* POP-UP 1 : Horaires de sommeil */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Moon className="h-4 w-4 text-yellow-400" />
              Tes heures de sommeil ?
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  Coucher
                </label>
                <input
                  type="time"
                  value={sleepStart}
                  onChange={(e) => setSleepStart(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  Réveil
                </label>
                <input
                  type="time"
                  value={sleepEnd}
                  onChange={(e) => setSleepEnd(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-yellow-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-yellow-500 py-3 text-xs font-black uppercase text-zinc-950 hover:bg-yellow-400"
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* POP-UP 2 : Qualité du sommeil (Auto-advance) */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Moon className="h-4 w-4 text-yellow-400" />
              Qualité du sommeil ?
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Mauvais (4/10)", val: 4 },
                { label: "Moyen (6/10)", val: 6 },
                { label: "Bon (8/10)", val: 8 },
                { label: "Top (10/10)", val: 10 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setSleepQuality(opt.val);
                    setStep(3);
                  }}
                  className={`rounded-xl border py-3 text-xs font-bold transition active:scale-95 ${
                    sleepQuality === opt.val
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Écrans", "Overthinking", "Stress", "Réveils"].map((tag) => {
                const active = sleepDisruptors.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleDisruptor(tag)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                      active
                        ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                        : "border-zinc-800 text-zinc-500"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* POP-UP 3 : Repas & Hydratation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Coffee className="h-4 w-4 text-yellow-400" />
              Repas & Hydratation ?
            </div>
            <div className="space-y-2">
              {(
                [
                  { id: "breakfast_and_pre", label: "Petit-déj + Pre-workout" },
                  { id: "breakfast_only", label: "Petit-déj uniquement" },
                  { id: "fasted", label: "À jeun" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPreWorkoutMeal(opt.id);
                    setStep(4);
                  }}
                  className={`w-full rounded-xl border py-2.5 text-xs font-bold transition active:scale-95 ${
                    preWorkoutMeal === opt.id
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setHydrated(!hydrated)}
              className={`w-full rounded-xl border py-2 text-[11px] font-bold ${
                hydrated
                  ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                  : "border-zinc-800 text-zinc-400"
              }`}
            >
              {hydrated ? "✓ Bien hydraté" : "Pas assez hydraté"}
            </button>
          </div>
        )}

        {/* POP-UP 4 : Caféine */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Coffee className="h-4 w-4 text-yellow-400" />
              Caféine avant la séance ?
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCaffeinePre(false);
                  setStep(5);
                }}
                className={`rounded-xl border py-3 text-xs font-bold ${
                  !caffeinePre
                    ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300"
                }`}
              >
                Non
              </button>
              <button
                type="button"
                onClick={() => setCaffeinePre(true)}
                className={`rounded-xl border py-3 text-xs font-bold ${
                  caffeinePre
                    ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300"
                }`}
              >
                Oui
              </button>
            </div>

            {caffeinePre && (
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
                <span className="text-zinc-400">À quelle heure ?</span>
                <input
                  type="time"
                  value={caffeineTime}
                  onChange={(e) => setCaffeineTime(e.target.value)}
                  className="rounded-lg bg-zinc-950 px-2 py-1 font-bold text-white outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setCaffeineEarlier(!caffeineEarlier)}
                className={`rounded-lg border py-2 font-semibold ${
                  caffeineEarlier
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                Plus tôt aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setCaffeineDayBefore(!caffeineDayBefore)}
                className={`rounded-lg border py-2 font-semibold ${
                  caffeineDayBefore
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                Hier (la veille)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-yellow-500 py-3 text-xs font-black uppercase text-zinc-950 hover:bg-yellow-400"
            >
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* POP-UP 5 : Stress (Auto-advance) */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Zap className="h-4 w-4 text-yellow-400" />
              Ton niveau de Stress aujourd&apos;hui ?
            </div>
            <div className="space-y-2">
              {[
                { label: "Calme / Bas (2/10)", val: 2 },
                { label: "Modéré (5/10)", val: 5 },
                { label: "Élevé (8/10)", val: 8 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setStress(opt.val);
                    setStep(6);
                  }}
                  className={`w-full rounded-xl border py-3 text-xs font-bold transition active:scale-95 ${
                    stress === opt.val
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POP-UP 6 : Énergie (Auto-advance) */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Flame className="h-4 w-4 text-yellow-400" />
              Ton niveau d&apos;Énergie ?
            </div>
            <div className="space-y-2">
              {[
                { label: "Fatigué (4/10)", val: 4 },
                { label: "Correct (7/10)", val: 7 },
                { label: "En feu (9/10)", val: 9 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setEnergy(opt.val);
                    setStep(7);
                  }}
                  className={`w-full rounded-xl border py-3 text-xs font-bold transition active:scale-95 ${
                    energy === opt.val
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POP-UP 7 : Motivation (Auto-finish!) */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Check className="h-4 w-4 text-yellow-400" />
              Ta Motivation pour cette séance ?
            </div>
            <div className="space-y-2">
              {[
                { label: "Basse (4/10)", val: 4 },
                { label: "Normale (7/10)", val: 7 },
                { label: "À fond (10/10)", val: 10 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    setMotivation(opt.val);
                    finishWithValues({ motivation: opt.val });
                  }}
                  className={`w-full rounded-xl border py-3 text-xs font-bold transition active:scale-95 ${
                    motivation === opt.val
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PostWorkoutWrapUpModalProps {
  open: boolean;
  sessionTime: string;
  firstWorkingSetTime?: string;
  onClose: () => void;
  onConfirmFinish: (intensity: number, negativeFactors: string) => void;
}

export function PostWorkoutWrapUpModal({
  open,
  sessionTime,
  firstWorkingSetTime,
  onClose,
  onConfirmFinish,
}: PostWorkoutWrapUpModalProps) {
  const [intensity, setIntensity] = useState(8);
  const [negativeFactors, setNegativeFactors] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-yellow-400">
            <Sparkles className="h-3.5 w-3.5" /> Clôture de séance
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] text-zinc-400 space-y-1">
          <div className="flex justify-between">
            <span>Début de séance (auto) :</span>
            <strong className="text-zinc-200">{sessionTime}</strong>
          </div>
          <div className="flex justify-between">
            <span>1ère série de travail (auto) :</span>
            <strong className="text-zinc-200">
              {firstWorkingSetTime || "—"}
            </strong>
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-bold text-white">
            Intensité de la séance
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "Légère", val: 5 },
              { label: "Modérée", val: 7 },
              { label: "Forte", val: 9 },
              { label: "Max", val: 10 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setIntensity(opt.val)}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  intensity === opt.val
                    ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-400">
            Facteurs négatifs ? (optionnel)
          </label>
          <input
            type="text"
            placeholder="Ex: fatigue, douleur épaule..."
            value={negativeFactors}
            onChange={(e) => setNegativeFactors(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-yellow-500"
          />
        </div>

        <button
          type="button"
          onClick={() => onConfirmFinish(intensity, negativeFactors.trim())}
          className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-400"
        >
          Sauvegarder & Terminer
        </button>
      </div>
    </div>
  );
}
