"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Coffee,
  Dumbbell,
  Moon,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  CoachClientSummary,
  CoachingCheckIn,
  MuscleGroup,
  UserSettings,
  WorkoutSession,
} from "@/types/workout";
import { RankPill } from "@/components/RankBadge";
import {
  compareExerciseWithHistory,
  getBestTopSet,
} from "@/lib/workout-engine";
import {
  CloudCoachClient,
  fetchCoachClients,
  getCurrentUserId,
} from "@/lib/supabase-sync";
import { PRESET_EXERCISES, SPLIT_11_DAYS } from "@/data/presets";

interface CoachDashboardProps {
  view: "athletes" | "sessions";
  settings: UserSettings;
  userCheckIns: CoachingCheckIn[];
  userHistory: WorkoutSession[];
}

interface DemoClientExtended extends CoachClientSummary {
  sessions: WorkoutSession[];
}

function makeSet(
  id: string,
  exerciseId: string,
  exerciseName: string,
  muscleGroup: MuscleGroup,
  setType: "top_set" | "backoff",
  weight: number,
  reps: number,
  daysAgo: number,
  unit: "kg" | "lbs" = "kg",
  isEachSide = false,
  unlockedRank?: "Iron" | "Bronze" | "Silver" | "Gold"
) {
  return {
    id,
    exerciseId,
    exerciseName,
    muscleGroup,
    setType,
    weight,
    unit,
    isEmptyBar: false,
    isEachSide,
    reps,
    completedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    unlockedRank,
  };
}

const DEMO_CLIENTS: DemoClientExtended[] = [
  {
    id: "client-yassine",
    fullName: "Yassine Benali",
    email: "yassine@clubfaouzi.ma",
    tier: "pro",
    highestRank: "Gold",
    latestSessionTitle: "Dos (4 Exercices)",
    latestSessionDate: new Date(Date.now() - 86400000).toISOString(),
    latestTopSetLabel: "Tirage Vertical · 80kg × 10",
    latestCheckIn: {
      id: "chk-demo-1",
      date: new Date(Date.now() - 86400000).toISOString(),
      fullName: "Yassine Benali",
      muscleGroup: "Dos",
      sleepStart: "23:15",
      sleepEnd: "07:15",
      sleepQuality: 8,
      sleepDisruptors: [],
      preWorkoutMeal: "breakfast_and_pre",
      hydrated: true,
      caffeinePre: true,
      caffeineTime: "17:30",
      caffeineEarlier: false,
      caffeineDayBefore: true,
      stress: 3,
      energy: 9,
      motivation: 9,
      sessionTime: "18:05",
      firstWorkingSetTime: "18:22",
      intensity: 9,
      readinessScore: 89,
    },
    sessions: [
      {
        id: "y-biceps",
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        dayTitle: "Biceps",
        splitDayIndex: 1,
        sets: [
          makeSet("yb1", "ez-bar-curl", "Curl Barre EZ Strict (Mur)", "Biceps", "top_set", 15, 11, 5, "kg", false, "Silver"),
          makeSet("yb2", "ez-bar-curl", "Curl Barre EZ Strict (Mur)", "Biceps", "backoff", 13, 11, 5),
          makeSet("yb3", "hammer-curl", "Curl Marteau Haltères", "Biceps", "top_set", 14, 12, 5),
        ],
      },
      {
        id: "y-shoulders",
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        dayTitle: "Épaule + Triceps",
        splitDayIndex: 3,
        sets: [
          makeSet("ysp1", "shoulder-press", "Développé Militaire (Épaules)", "Épaules", "top_set", 50, 8, 3, "kg", false, "Gold"),
          makeSet("ysp2", "lateral-raises", "Élévations Latérales", "Épaules", "top_set", 15, 10, 3, "kg", false, "Silver"),
          makeSet("ysp3", "triceps-pushdown", "Extension Triceps Poulie Haute", "Triceps", "top_set", 35, 10, 3, "kg", false, "Gold"),
        ],
      },
      {
        id: "y-dos",
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        dayTitle: "Dos (4 Exercices)",
        splitDayIndex: 5,
        sets: [
          makeSet("yd1", "lat-pulldown", "Tirage Vertical (Lat Pulldown)", "Dos", "top_set", 80, 10, 1, "kg", false, "Gold"),
          makeSet("yd2", "lat-pulldown", "Tirage Vertical (Lat Pulldown)", "Dos", "backoff", 68, 10, 1),
          makeSet("yd3", "rowing", "Rowing Horizontal / Barre", "Dos", "top_set", 80, 8, 1, "kg", false, "Gold"),
          makeSet("yd4", "face-pull", "Face Pull & Shrugs", "Dos", "top_set", 40, 12, 1, "kg", false, "Gold"),
        ],
      },
      {
        id: "y-chest",
        date: new Date(Date.now() - 8 * 86400000).toISOString(),
        dayTitle: "Chest",
        splitDayIndex: 8,
        sets: [
          makeSet("yc1", "bench-press", "Développé Couché (Bench Press)", "Chest", "top_set", 100, 8, 8, "kg", false, "Gold"),
          makeSet("yc2", "incline-db", "Développé Incliné Haltères", "Chest", "top_set", 35, 8, 8, "kg", false, "Gold"),
        ],
      },
      {
        id: "y-legs",
        date: new Date(Date.now() - 6 * 86400000).toISOString(),
        dayTitle: "Legs Day",
        splitDayIndex: 10,
        sets: [
          makeSet("yl1", "squats", "Squat Barre Libre", "Legs", "top_set", 45, 5, 6, "kg", true, "Gold"),
          makeSet("yl2", "leg-curls", "Leg Curl (Ischio-jambiers)", "Legs", "top_set", 55, 9, 6, "kg", false, "Gold"),
          makeSet("yl3", "calves", "Élévations Mollets (Standing Calf Raise)", "Legs", "top_set", 160, 12, 6, "lbs", false, "Silver"),
        ],
      },
    ],
  },
  {
    id: "client-karim",
    fullName: "Karim Tazi",
    email: "karim@clubfaouzi.ma",
    tier: "pro",
    highestRank: "Silver",
    latestSessionTitle: "Legs Day",
    latestSessionDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    latestTopSetLabel: "Squat Barre Libre · 35kg/côté × 5",
    latestCheckIn: {
      id: "chk-demo-2",
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      fullName: "Karim Tazi",
      muscleGroup: "Legs Day",
      sleepStart: "01:30",
      sleepEnd: "07:00",
      sleepQuality: 5,
      sleepDisruptors: ["Écrans", "Stress"],
      preWorkoutMeal: "breakfast_only",
      hydrated: false,
      caffeinePre: true,
      caffeineTime: "19:00",
      caffeineEarlier: true,
      caffeineDayBefore: true,
      stress: 7,
      energy: 5,
      motivation: 6,
      sessionTime: "19:15",
      firstWorkingSetTime: "19:38",
      intensity: 7,
      negativeFactors: "Manque de sommeil",
      readinessScore: 54,
    },
    sessions: [
      {
        id: "k-legs",
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        dayTitle: "Legs Day",
        splitDayIndex: 10,
        sets: [
          makeSet("kl1", "squats", "Squat Barre Libre", "Legs", "top_set", 35, 5, 2, "kg", true, "Silver"),
          makeSet("kl2", "squats", "Squat Barre Libre", "Legs", "backoff", 30, 6, 2, "kg", true),
          makeSet("kl3", "leg-curls", "Leg Curl (Ischio-jambiers)", "Legs", "top_set", 35, 10, 2, "kg", false, "Bronze"),
        ],
      },
      {
        id: "k-chest",
        date: new Date(Date.now() - 4 * 86400000).toISOString(),
        dayTitle: "Chest",
        splitDayIndex: 8,
        sets: [
          makeSet("kc1", "bench-press", "Développé Couché (Bench Press)", "Chest", "top_set", 80, 8, 4, "kg", false, "Silver"),
        ],
      },
    ],
  },
];

const CYCLE_TRAINING_DAYS = SPLIT_11_DAYS.filter((d) => !d.isRest);

export function CoachDashboard({
  view,
  settings,
  userCheckIns,
  userHistory,
}: CoachDashboardProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(
    "client-yassine"
  );
  const [cycleFilter, setCycleFilter] = useState<string>("Tous");
  const [cloudClients, setCloudClients] = useState<CloudCoachClient[]>([]);

  useEffect(() => {
    void getCurrentUserId().then((uid) => {
      if (!uid) return;
      void fetchCoachClients(uid).then((list) => {
        if (list.length > 0) {
          setCloudClients(list);
          setSelectedClientId(list[0].id);
        }
      });
    });
  }, []);

  const clients = useMemo<DemoClientExtended[]>(() => {
    if (cloudClients.length > 0) {
      return cloudClients;
    }
    if (settings.email) {
      return [];
    }
    const latestSess = userHistory[0];
    const best = latestSess ? getBestTopSet(latestSess.sets) : null;
    const selfClient: DemoClientExtended = {
      id: "self",
      fullName: `${settings.displayName || "Athlète"} (Moi)`,
      email: settings.email || "session-locale",
      tier: settings.tier,
      highestRank: "Bronze",
      latestSessionTitle: latestSess?.dayTitle,
      latestSessionDate: latestSess?.date,
      latestTopSetLabel: best
        ? `${best.exerciseName} · ${best.weight}${best.unit} × ${best.reps}`
        : undefined,
      latestCheckIn: userCheckIns[0],
      sessions: userHistory,
    };
    return [...DEMO_CLIENTS, selfClient];
  }, [cloudClients, settings, userCheckIns, userHistory]);

  const selectedClient =
    clients.find((c) => c.id === selectedClientId) ?? clients[0] ?? null;

  // Build complete cycle performance overview for selected client
  const cycleOverview = useMemo(() => {
    if (!selectedClient) return [];
    const sorted = [...selectedClient.sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const daysToShow =
      cycleFilter === "Tous"
        ? CYCLE_TRAINING_DAYS
        : CYCLE_TRAINING_DAYS.filter((d) => d.title === cycleFilter);

    return daysToShow.map((day) => {
      // Find latest session matching this day or containing any exercise of this day
      const matchingSession = sorted.find(
        (s) =>
          s.splitDayIndex === day.dayIndex ||
          s.dayTitle === day.title ||
          s.sets.some((st) => day.exerciseIds.includes(st.exerciseId))
      );

      const exerciseSummaries = day.exerciseIds.map((exId) => {
        const ex = PRESET_EXERCISES.find((e) => e.id === exId);
        const latestSessIdx = sorted.findIndex((s) =>
          s.sets.some((st) => st.exerciseId === exId)
        );
        const latestSess = latestSessIdx >= 0 ? sorted[latestSessIdx] : null;
        const prevHistory =
          latestSessIdx >= 0 ? sorted.slice(latestSessIdx + 1) : [];
        const comp = latestSess
          ? compareExerciseWithHistory(exId, latestSess.sets, prevHistory)
          : null;
        const bestSet = latestSess
          ? getBestTopSet(
              latestSess.sets.filter((st) => st.exerciseId === exId)
            )
          : null;

        return {
          exerciseId: exId,
          name: ex?.name ?? exId,
          date: latestSess?.date,
          bestSet,
          comp,
        };
      });

      return {
        day,
        lastDate: matchingSession?.date,
        exerciseSummaries,
      };
    });
  }, [selectedClient, cycleFilter]);

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-400">
            Espace Coach · Consultation
          </p>
          <h2 className="text-xl font-black text-white">
            {view === "athletes"
              ? `Mes Athlètes (${clients.length})`
              : `Cycle Complet · ${selectedClient?.fullName ?? "Aucun client"}`}
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-300">
          {view === "athletes" ? (
            <>
              <Users className="h-3.5 w-3.5 text-yellow-400" />
              Check-ins
            </>
          ) : (
            <>
              <Dumbbell className="h-3.5 w-3.5 text-yellow-400" />
              11-Day Cycle
            </>
          )}
        </span>
      </div>

      {/* Empty state for real Coach with 0 linked athletes */}
      {clients.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center space-y-2">
          <Users className="mx-auto h-8 w-8 text-yellow-400" />
          <h3 className="text-sm font-black text-white">
            Aucun athlète lié pour le moment
          </h3>
          <p className="text-xs text-zinc-400">
            Partage ton Code Coach{" "}
            <span className="font-mono font-bold text-yellow-400">
              {settings.coachCode || "dans l'onglet Profil"}
            </span>{" "}
            à tes clients pour qu&apos;ils apparaissent ici dès leur inscription.
          </p>
        </div>
      )}

      {/* Horizontal Client Selector */}
      {clients.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
        {clients.map((client) => {
          const isSelected = client.id === selectedClient.id;
          const score = client.latestCheckIn?.readinessScore;
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelectedClientId(client.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                isSelected
                  ? "border-yellow-500 bg-yellow-500/15 text-white"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>{client.fullName}</span>
              {score !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    score >= 75
                      ? "bg-emerald-500/20 text-emerald-400"
                      : score >= 60
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {score}%
                </span>
              )}
            </button>
          );
        })}
        </div>
      )}

      {/* VIEW 1: ATHLÈTES & CHECK-INS */}
      {view === "athletes" && selectedClient && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {selectedClient.fullName}
                </h3>
                <RankPill rank={selectedClient.highestRank} />
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {selectedClient.latestTopSetLabel ||
                  "En attente de la prochaine séance"}
              </p>
            </div>
            {selectedClient.latestCheckIn && (
              <div className="text-right">
                <div className="text-[10px] uppercase text-zinc-500">
                  Forme du jour
                </div>
                <div className="text-lg font-black text-yellow-400">
                  {selectedClient.latestCheckIn.readinessScore}%
                </div>
              </div>
            )}
          </div>

          {!selectedClient.latestCheckIn ? (
            <p className="py-6 text-center text-xs text-zinc-500">
              Cet athlète n&apos;a pas encore rempli de Check-in.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400">
                    <Moon className="h-3.5 w-3.5 text-yellow-400" /> Sommeil
                  </div>
                  <div className="font-bold text-white">
                    {selectedClient.latestCheckIn.sleepStart} →{" "}
                    {selectedClient.latestCheckIn.sleepEnd}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Qualité : {selectedClient.latestCheckIn.sleepQuality}/10
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400">
                    <Coffee className="h-3.5 w-3.5 text-yellow-400" /> Caféine
                    & Repas
                  </div>
                  <div className="font-bold text-white">
                    {selectedClient.latestCheckIn.caffeinePre
                      ? `Oui (${selectedClient.latestCheckIn.caffeineTime || "pré"})`
                      : "Sans caféine pré"}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Hydraté :{" "}
                    {selectedClient.latestCheckIn.hydrated ? "Oui" : "Non"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center">
                <div>
                  <div className="text-[10px] text-zinc-500">Stress</div>
                  <div className="font-black text-white">
                    {selectedClient.latestCheckIn.stress}/10
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Énergie</div>
                  <div className="font-black text-white">
                    {selectedClient.latestCheckIn.energy}/10
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Motiv.</div>
                  <div className="font-black text-white">
                    {selectedClient.latestCheckIn.motivation}/10
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">Intensité</div>
                  <div className="font-black text-yellow-400">
                    {selectedClient.latestCheckIn.intensity ?? "—"}/10
                  </div>
                </div>
              </div>

              {(selectedClient.latestCheckIn.sessionTime ||
                selectedClient.latestCheckIn.negativeFactors) && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-1 text-[11px] text-zinc-300">
                  {selectedClient.latestCheckIn.sessionTime && (
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-yellow-400" />
                      Séance : {selectedClient.latestCheckIn.sessionTime} · 1er
                      Top Set :{" "}
                      {selectedClient.latestCheckIn.firstWorkingSetTime || "—"}
                    </div>
                  )}
                  {selectedClient.latestCheckIn.negativeFactors && (
                    <div className="flex items-center gap-1.5 text-rose-300">
                      <Zap className="h-3.5 w-3.5" />
                      Facteur négatif :{" "}
                      {selectedClient.latestCheckIn.negativeFactors}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TOUTES LES DERNIÈRES PERFORMANCES DU CYCLE */}
      {view === "sessions" && selectedClient && (
        <div className="space-y-4">
          {/* Cycle Day Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["Tous", ...CYCLE_TRAINING_DAYS.map((d) => d.title)].map(
              (label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCycleFilter(label)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                    cycleFilter === label
                      ? "bg-white text-zinc-950"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          {cycleOverview.map(({ day, lastDate, exerciseSummaries }) => (
            <div
              key={day.dayIndex}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                    {day.dayLabel}
                  </span>
                  <h3 className="text-sm font-black text-white">{day.title}</h3>
                </div>
                <span className="text-[11px] text-zinc-500">
                  {lastDate
                    ? new Date(lastDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })
                    : "Pas encore fait"}
                </span>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {exerciseSummaries.map((ex) => (
                  <div
                    key={ex.exerciseId}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-zinc-200">
                        {ex.name}
                      </div>
                      {ex.comp && ex.comp.hasPrevious && (
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                            ex.comp.delta1RM >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {ex.comp.delta1RM >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {ex.comp.delta1RM >= 0 ? "+" : ""}
                          {ex.comp.delta1RM}kg 1RM
                        </div>
                      )}
                    </div>

                    {ex.bestSet ? (
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <div className="font-extrabold text-white">
                            {ex.bestSet.isEmptyBar
                              ? "Barre vide"
                              : `${ex.bestSet.weight}${ex.bestSet.unit}${
                                  ex.bestSet.isEachSide ? "/côté" : ""
                                }`}{" "}
                            × {ex.bestSet.reps}
                          </div>
                          {ex.comp && (
                            <div className="text-[10px] text-zinc-500">
                              1RM est. {ex.comp.current1RM}kg
                            </div>
                          )}
                        </div>
                        {ex.bestSet.unlockedRank && (
                          <RankPill rank={ex.bestSet.unlockedRank} />
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-600">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
