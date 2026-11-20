"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Loader2,
  User,
  Users,
} from "lucide-react";
import {
  RoundingStep,
  UserRole,
  UserSettings,
  WeightUnit,
} from "@/types/workout";
import { getCurrentUserId, linkCoachByCode } from "@/lib/supabase-sync";

interface OnboardingFlowProps {
  initialSettings: UserSettings;
  onComplete: (updates: Partial<UserSettings>) => void;
}

export function OnboardingFlow({
  initialSettings,
  onComplete,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [displayName, setDisplayName] = useState(
    initialSettings.displayName === "Athlète Faouzi"
      ? ""
      : initialSettings.displayName
  );
  const [role, setRole] = useState<UserRole>(initialSettings.role);
  const [coachCode, setCoachCode] = useState(initialSettings.coachCode ?? "");
  const [verifiedCoachName, setVerifiedCoachName] = useState<
    string | undefined
  >(initialSettings.linkedCoachName);
  const [coachCheckLoading, setCoachCheckLoading] = useState(false);
  const [coachCheckMessage, setCoachCheckMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [splitMode, setSplitMode] = useState<"11-day" | "custom">(
    initialSettings.splitMode
  );
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>(
    initialSettings.preferredUnit
  );
  const [roundingStep, setRoundingStep] = useState<RoundingStep>(
    initialSettings.roundingStep
  );

  const normalizedCoachCode = coachCode.trim().toUpperCase();
  const isCoachCodeFormatValid =
    normalizedCoachCode.length === 0 ||
    /^[A-Z0-9-]{4,24}$/.test(normalizedCoachCode);

  const handleVerifyCoachCode = async () => {
    setCoachCheckLoading(true);
    setCoachCheckMessage(null);
    try {
      const uid = (await getCurrentUserId()) ?? "";
      const res = await linkCoachByCode(uid, coachCode);
      if (res.ok) {
        setVerifiedCoachName(res.coachName);
        if (res.coachCode) setCoachCode(res.coachCode);
        setCoachCheckMessage({
          type: "success",
          text: `Coach trouvé : ${res.coachName ?? "Coach"} (${res.coachCode ?? normalizedCoachCode})`,
        });
      } else {
        setVerifiedCoachName(undefined);
        setCoachCheckMessage({
          type: "error",
          text: res.error ?? "Code coach invalide.",
        });
      }
    } catch {
      setCoachCheckMessage({
        type: "error",
        text: "Impossible de vérifier le code coach.",
      });
    } finally {
      setCoachCheckLoading(false);
    }
  };

  const handleFinish = () => {
    onComplete({
      displayName: displayName.trim() || "Athlète Faouzi",
      role,
      coachCode: normalizedCoachCode || undefined,
      linkedCoachName: verifiedCoachName,
      splitMode,
      preferredUnit,
      roundingStep,
      onboardingCompleted: true,
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center bg-zinc-950 px-5 py-8 text-zinc-50">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-6">
        {/* Progress Dots */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
              Configuration · Étape {step}/3
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 w-6 rounded-full ${
                  step >= n ? "bg-yellow-500" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Bienvenue au Club Faouzi
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Ton nom sera pré-rempli automatiquement dans tes Check-ins.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Nom complet
              </label>
              <input
                type="text"
                placeholder="Ex: Nawfal Maghraoui"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Tu utilises l&apos;app en tant que :
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole("athlete")}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                    role === "athlete"
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-zinc-800 bg-zinc-950"
                  }`}
                >
                  <User className="mb-1.5 h-5 w-5 text-yellow-400" />
                  <span className="text-xs font-black text-white">Athlète</span>
                  <span className="text-[11px] text-zinc-400">
                    Je track mes séances & check-ins
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("coach")}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                    role === "coach"
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-zinc-800 bg-zinc-950"
                  }`}
                >
                  <Users className="mb-1.5 h-5 w-5 text-yellow-400" />
                  <span className="text-xs font-black text-white">Coach</span>
                  <span className="text-[11px] text-zinc-400">
                    Je suis mes clients + mes séances
                  </span>
                </button>
              </div>
            </div>

            {role === "athlete" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400">
                  Code de ton Coach (optionnel)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: FAOUZI-PRO"
                    value={coachCode}
                    onChange={(e) => {
                      setCoachCode(e.target.value.toUpperCase());
                      setVerifiedCoachName(undefined);
                      setCoachCheckMessage(null);
                    }}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-bold uppercase text-white outline-none focus:border-yellow-500"
                  />
                  {normalizedCoachCode.length > 0 && (
                    <button
                      type="button"
                      onClick={handleVerifyCoachCode}
                      disabled={coachCheckLoading || !isCoachCodeFormatValid}
                      className="inline-flex items-center gap-1 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-50"
                    >
                      {coachCheckLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Vérifier"
                      )}
                    </button>
                  )}
                </div>
                {!isCoachCodeFormatValid && (
                  <p className="text-[11px] text-amber-400">
                    Format attendu : 4+ caractères alphanumériques (ex: FAOUZI-PRO).
                  </p>
                )}
                {coachCheckMessage && (
                  <p
                    className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                      coachCheckMessage.type === "success"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {coachCheckMessage.type === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {coachCheckMessage.text}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => (role === "coach" ? handleFinish() : setStep(2))}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-400"
            >
              {role === "coach" ? "Accéder à l'Espace Coach" : "Continuer"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Choisis ton planning
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Tu pourras changer à tout moment dans l&apos;onglet Planning.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setSplitMode("11-day")}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  splitMode === "11-day"
                    ? "border-yellow-500 bg-yellow-500/10"
                    : "border-zinc-800 bg-zinc-950"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">
                    Cycle 11 Jours (Club Faouzi)
                  </span>
                  {splitMode === "11-day" && (
                    <Check className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Biceps · Rest · Épaules+Triceps · Rest · Dos · Rest · Rest ·
                  Chest · Rest · Legs · Rest.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode("custom")}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  splitMode === "custom"
                    ? "border-yellow-500 bg-yellow-500/10"
                    : "border-zinc-800 bg-zinc-950"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">
                    Planning Personnalisé
                  </span>
                  {splitMode === "custom" && (
                    <Check className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Crée tes propres jours et choisis tes exercices librement.
                </p>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-zinc-800 px-4 py-3 text-xs font-bold text-zinc-400"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-400"
              >
                Continuer
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">
                Unités & Calcul 0.85x
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Pour arrondir automatiquement tes séries Back-off selon les
                disques de ta salle.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Unité principale
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["kg", "lbs"] as WeightUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setPreferredUnit(u)}
                    className={`rounded-xl border py-2.5 text-xs font-black uppercase ${
                      preferredUnit === u
                        ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
                Arrondi Back-off (0.85x)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([0.5, 1, 2.5] as RoundingStep[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRoundingStep(s)}
                    className={`rounded-xl border py-2.5 text-xs font-bold ${
                      roundingStep === s
                        ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400"
                    }`}
                  >
                    {s} kg
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-zinc-800 px-4 py-3 text-xs font-bold text-zinc-400"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 text-sm font-black text-zinc-950 hover:bg-yellow-400"
              >
                Lancer ma 1ère séance
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
