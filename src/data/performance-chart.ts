import { ChartExerciseRule, FaouziRank, MuscleGroup } from "@/types/workout";

export const RANK_ORDER: FaouziRank[] = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Diamond",
  "Master",
];

export const RANK_STYLES: Record<
  FaouziRank,
  {
    color: string;
    bg: string;
    border: string;
    glow: string;
    label: string;
  }
> = {
  Iron: {
    color: "text-zinc-300",
    bg: "bg-zinc-800/80",
    border: "border-zinc-500/60",
    glow: "shadow-zinc-500/20",
    label: "IRON",
  },
  Bronze: {
    color: "text-amber-500",
    bg: "bg-amber-950/60",
    border: "border-amber-600/60",
    glow: "shadow-amber-500/20",
    label: "BRONZE",
  },
  Silver: {
    color: "text-slate-200",
    bg: "bg-slate-800/70",
    border: "border-slate-300/60",
    glow: "shadow-slate-300/20",
    label: "SILVER",
  },
  Gold: {
    color: "text-yellow-400",
    bg: "bg-yellow-950/50",
    border: "border-yellow-400/70",
    glow: "shadow-yellow-500/30",
    label: "GOLD",
  },
  Diamond: {
    color: "text-cyan-400",
    bg: "bg-cyan-950/50",
    border: "border-cyan-400/70",
    glow: "shadow-cyan-400/30",
    label: "DIAMOND",
  },
  Master: {
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-950/50",
    border: "border-fuchsia-400/70",
    glow: "shadow-fuchsia-500/30",
    label: "MASTER",
  },
};

// Barème basé sur la Club Faouzi Men's Performance Chart
export const FAOUZI_PERFORMANCE_CHART: ChartExerciseRule[] = [
  // BACK
  {
    exerciseKey: "lat-pulldown",
    displayName: "Lat Pull Down / Pull Ups",
    muscleGroup: "Dos",
    thresholds: [
      { rank: "Iron", weightKg: 35, reps: 10 },
      { rank: "Bronze", weightKg: 40, reps: 10 },
      { rank: "Silver", weightKg: 60, reps: 10 },
      { rank: "Gold", weightKg: 80, reps: 10 },
      { rank: "Diamond", weightKg: 100, reps: 10 },
      { rank: "Master", weightKg: 120, reps: 10 },
    ],
  },
  {
    exerciseKey: "rowing",
    displayName: "Rowing",
    muscleGroup: "Dos",
    thresholds: [
      { rank: "Iron", weightKg: 30, reps: 8 },
      { rank: "Bronze", weightKg: 40, reps: 8 },
      { rank: "Silver", weightKg: 60, reps: 8 },
      { rank: "Gold", weightKg: 80, reps: 8 },
      { rank: "Diamond", weightKg: 100, reps: 8 },
      { rank: "Master", weightKg: 120, reps: 8 },
    ],
  },
  {
    exerciseKey: "face-pull",
    displayName: "Face Pull & Shrugs",
    muscleGroup: "Dos",
    thresholds: [
      { rank: "Iron", weightKg: 15, reps: 10 },
      { rank: "Bronze", weightKg: 20, reps: 10 },
      { rank: "Silver", weightKg: 30, reps: 10 },
      { rank: "Gold", weightKg: 40, reps: 10 },
      { rank: "Diamond", weightKg: 50, reps: 10 },
      { rank: "Master", weightKg: 60, reps: 10 },
    ],
  },
  // CHEST
  {
    exerciseKey: "bench-press",
    displayName: "Développé Couché / Chest Press",
    muscleGroup: "Chest",
    thresholds: [
      { rank: "Iron", weightKg: 50, reps: 8 },
      { rank: "Bronze", weightKg: 60, reps: 8 },
      { rank: "Silver", weightKg: 80, reps: 8 },
      { rank: "Gold", weightKg: 100, reps: 8 },
      { rank: "Diamond", weightKg: 110, reps: 8 },
      { rank: "Master", weightKg: 120, reps: 5 },
    ],
  },
  {
    exerciseKey: "incline-db",
    displayName: "Développé Incliné Haltères",
    muscleGroup: "Chest",
    thresholds: [
      { rank: "Iron", weightKg: 15, reps: 8 },
      { rank: "Bronze", weightKg: 20, reps: 8 },
      { rank: "Silver", weightKg: 25, reps: 8 },
      { rank: "Gold", weightKg: 35, reps: 8 },
      { rank: "Diamond", weightKg: 45, reps: 8 },
      { rank: "Master", weightKg: 50, reps: 8 },
    ],
  },
  // SHOULDERS & TRICEPS
  {
    exerciseKey: "shoulder-press",
    displayName: "Développé Épaules",
    muscleGroup: "Épaules",
    thresholds: [
      { rank: "Iron", weightKg: 30, reps: 8 },
      { rank: "Bronze", weightKg: 35, reps: 8 },
      { rank: "Silver", weightKg: 40, reps: 8 },
      { rank: "Gold", weightKg: 50, reps: 8 },
      { rank: "Diamond", weightKg: 60, reps: 8 },
      { rank: "Master", weightKg: 70, reps: 8 },
    ],
  },
  {
    exerciseKey: "lateral-raises",
    displayName: "Élévations Latérales",
    muscleGroup: "Épaules",
    thresholds: [
      { rank: "Iron", weightKg: 10, reps: 10 },
      { rank: "Bronze", weightKg: 12, reps: 8 },
      { rank: "Silver", weightKg: 15, reps: 8 },
      { rank: "Gold", weightKg: 20, reps: 8 },
      { rank: "Diamond", weightKg: 25, reps: 8 },
      { rank: "Master", weightKg: 30, reps: 8 },
    ],
  },
  {
    exerciseKey: "triceps-pushdown",
    displayName: "Triceps Pushdown / Barre",
    muscleGroup: "Triceps",
    thresholds: [
      { rank: "Iron", weightKg: 15, reps: 10 },
      { rank: "Bronze", weightKg: 20, reps: 8 },
      { rank: "Silver", weightKg: 25, reps: 8 },
      { rank: "Gold", weightKg: 35, reps: 8 },
      { rank: "Diamond", weightKg: 45, reps: 8 },
      { rank: "Master", weightKg: 55, reps: 8 },
    ],
  },
  // BICEPS
  {
    exerciseKey: "ez-bar-curl",
    displayName: "Barre EZ contre le mur",
    muscleGroup: "Biceps",
    thresholds: [
      { rank: "Iron", weightKg: 7.5, reps: 10 },
      { rank: "Bronze", weightKg: 10, reps: 10 },
      { rank: "Silver", weightKg: 15, reps: 10 },
      { rank: "Gold", weightKg: 20, reps: 10 },
      { rank: "Diamond", weightKg: 25, reps: 8 },
      { rank: "Master", weightKg: 30, reps: 8 },
    ],
  },
  // LEGS
  {
    exerciseKey: "squats",
    displayName: "Squats",
    muscleGroup: "Legs",
    thresholds: [
      { rank: "Iron", weightKg: 25, reps: 5 },
      { rank: "Bronze", weightKg: 35, reps: 5 },
      { rank: "Silver", weightKg: 50, reps: 5 },
      { rank: "Gold", weightKg: 70, reps: 5 },
      { rank: "Diamond", weightKg: 90, reps: 5 },
      { rank: "Master", weightKg: 110, reps: 5 },
    ],
  },
  {
    exerciseKey: "leg-curls",
    displayName: "Leg Curls",
    muscleGroup: "Legs",
    thresholds: [
      { rank: "Iron", weightKg: 25, reps: 8 },
      { rank: "Bronze", weightKg: 35, reps: 8 },
      { rank: "Silver", weightKg: 45, reps: 8 },
      { rank: "Gold", weightKg: 55, reps: 8 },
      { rank: "Diamond", weightKg: 65, reps: 8 },
      { rank: "Master", weightKg: 80, reps: 8 },
    ],
  },
  {
    exerciseKey: "calves",
    displayName: "Calves (Mollets)",
    muscleGroup: "Legs",
    thresholds: [
      { rank: "Iron", weightKg: 40, reps: 10 },
      { rank: "Bronze", weightKg: 55, reps: 10 },
      { rank: "Silver", weightKg: 70, reps: 10 },
      { rank: "Gold", weightKg: 85, reps: 10 },
      { rank: "Diamond", weightKg: 100, reps: 10 },
      { rank: "Master", weightKg: 120, reps: 10 },
    ],
  },
];

export function evaluateRankForSet(
  exerciseId: string,
  muscleGroup: MuscleGroup,
  weightKg: number,
  reps: number
): FaouziRank | null {
  const rule =
    FAOUZI_PERFORMANCE_CHART.find((r) => r.exerciseKey === exerciseId) ??
    FAOUZI_PERFORMANCE_CHART.find((r) => r.muscleGroup === muscleGroup);

  if (!rule) return null;

  let highest: FaouziRank | null = null;
  for (const t of rule.thresholds) {
    if (weightKg >= t.weightKg && reps >= t.reps) {
      highest = t.rank;
    }
  }
  return highest;
}
