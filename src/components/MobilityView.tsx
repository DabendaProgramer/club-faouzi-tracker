"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Video,
} from "lucide-react";
import { MOBILITY_ROUTINES } from "@/data/presets";
import { MobilityExercise, UserSettings } from "@/types/workout";
import { playTimerBeep } from "@/lib/sound";

interface MobilityViewProps {
  settings: UserSettings;
  onUnlockProClick: () => void;
}

export function MobilityView({
  settings,
  onUnlockProClick,
}: MobilityViewProps) {
  const [phase, setPhase] = useState<"pre" | "post">("pre");
  const [activeExId, setActiveExId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>(
    {}
  );

  const list = MOBILITY_ROUTINES.filter((m) => m.phase === phase);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playTimerBeep();
          if (activeExId) {
            setCompletedSets((prevSets) => ({
              ...prevSets,
              [activeExId]: (prevSets[activeExId] ?? 0) + 1,
            }));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, activeExId]);

  const handleStart = (item: MobilityExercise) => {
    if (settings.tier !== "pro") {
      onUnlockProClick();
      return;
    }
    if (activeExId === item.id && secondsLeft > 0) {
      setIsRunning(!isRunning);
      return;
    }
    setActiveExId(item.id);
    setSecondsLeft(item.durationSeconds);
    setIsRunning(true);
  };

  const handleReset = (item: MobilityExercise) => {
    setActiveExId(item.id);
    setSecondsLeft(item.durationSeconds);
    setIsRunning(false);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-extrabold text-white">
            <Timer className="h-4 w-4 text-yellow-400" />
            Mobilité & Étirements Guidés
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

        <p className="mt-1 text-xs text-zinc-400">
          {phase === "pre"
            ? "Routine d'activation & mobilité avant ta séance."
            : "Tous les étirements inclus (2 × 50s), 3 à 4 fois par semaine."}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => setPhase("pre")}
            className={`rounded-xl border py-2 text-xs font-bold transition ${
              phase === "pre"
                ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400"
            }`}
          >
            Avant l&apos;entraînement
          </button>
          <button
            onClick={() => setPhase("post")}
            className={`rounded-xl border py-2 text-xs font-bold transition ${
              phase === "post"
                ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                : "border-zinc-800 bg-zinc-950 text-zinc-400"
            }`}
          >
            Après / Hors séance
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {list.map((item, index) => {
          const isCurrent = activeExId === item.id;
          const doneCount = completedSets[item.id] ?? 0;
          const isFinished = doneCount >= item.targetSets;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition ${
                isCurrent
                  ? "border-yellow-500 bg-yellow-500/10"
                  : isFinished
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : "border-zinc-800 bg-zinc-900/70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-yellow-400">
                      #{index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {item.name}
                    </h3>
                    {item.timestampRef && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                        <Video className="h-3 w-3 text-sky-400" />
                        {item.timestampRef}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {item.durationSeconds}s · {item.setsRange} ·{" "}
                    <span
                      className={
                        isFinished
                          ? "font-bold text-emerald-400"
                          : "text-zinc-300"
                      }
                    >
                      {doneCount}/{item.targetSets} fait
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-black text-white">
                    {isCurrent ? `${secondsLeft}s` : `${item.durationSeconds}s`}
                  </span>
                  <button
                    onClick={() => handleStart(item)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 ${
                      isCurrent && isRunning
                        ? "bg-amber-500 text-zinc-950"
                        : "bg-yellow-500 text-zinc-950 hover:bg-yellow-400"
                    }`}
                    aria-label="Démarrer ou mettre en pause"
                  >
                    {isCurrent && isRunning ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleReset(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
                    aria-label="Réinitialiser"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isFinished && (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Étirement complété !
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
