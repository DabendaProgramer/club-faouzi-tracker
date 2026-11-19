import {
  LoggedSet,
  RoundingStep,
  WeightUnit,
  WorkoutSession,
} from "@/types/workout";

export function roundToStep(value: number, step: RoundingStep): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function calculateBackoffWeight(
  topSetWeight: number,
  ratio = 0.85,
  step: RoundingStep = 0.5
): number {
  const raw = topSetWeight * ratio;
  const rounded = roundToStep(raw, step);
  return Number(rounded.toFixed(2));
}

export function toKg(weight: number, unit: WeightUnit): number {
  if (unit === "kg") return weight;
  return Number((weight * 0.45359237).toFixed(2));
}

export function estimate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}

export function isWorkingSet(set: LoggedSet): boolean {
  return set.setType !== "warmup" && set.setType !== "activation";
}

export function getBestTopSet(sets: LoggedSet[]): LoggedSet | null {
  const working = sets.filter(isWorkingSet);
  if (working.length === 0) return null;
  return working.reduce((best, curr) => {
    const best1RM = estimate1RM(toKg(best.weight, best.unit), best.reps);
    const curr1RM = estimate1RM(toKg(curr.weight, curr.unit), curr.reps);
    return curr1RM > best1RM ? curr : best;
  }, working[0]);
}

export function calculateWorkingVolumeKg(sets: LoggedSet[]): number {
  return Number(
    sets
      .filter(isWorkingSet)
      .reduce((sum, s) => {
        const multiplier = s.isEachSide ? 2 : 1;
        return sum + toKg(s.weight * multiplier, s.unit) * s.reps;
      }, 0)
      .toFixed(1)
  );
}

export interface ExerciseComparison {
  hasPrevious: boolean;
  previousDate?: string;
  prevBestWeight?: number;
  prevBestReps?: number;
  prevUnit?: WeightUnit;
  prevVolumeKg: number;
  prev1RM: number;
  currentBestWeight: number;
  currentBestReps: number;
  currentVolumeKg: number;
  current1RM: number;
  deltaWeight: number;
  deltaReps: number;
  deltaVolumePct: number;
  delta1RM: number;
  isPR: boolean;
}

export function compareExerciseWithHistory(
  exerciseId: string,
  currentSets: LoggedSet[],
  history: WorkoutSession[]
): ExerciseComparison {
  const myCurrent = currentSets.filter((s) => s.exerciseId === exerciseId);
  const currBest = getBestTopSet(myCurrent);
  const currentVolumeKg = calculateWorkingVolumeKg(myCurrent);
  const current1RM = currBest
    ? estimate1RM(toKg(currBest.weight, currBest.unit), currBest.reps)
    : 0;

  // Find most recent past session containing working sets for this exercise
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let prevSets: LoggedSet[] = [];
  let prevDate: string | undefined;

  for (const sess of sortedHistory) {
    const matching = sess.sets.filter(
      (s) => s.exerciseId === exerciseId && isWorkingSet(s)
    );
    if (matching.length > 0) {
      prevSets = matching;
      prevDate = sess.date;
      break;
    }
  }

  if (prevSets.length === 0) {
    return {
      hasPrevious: false,
      prevVolumeKg: 0,
      prev1RM: 0,
      currentBestWeight: currBest?.weight ?? 0,
      currentBestReps: currBest?.reps ?? 0,
      currentVolumeKg,
      current1RM,
      deltaWeight: 0,
      deltaReps: 0,
      deltaVolumePct: 0,
      delta1RM: 0,
      isPR: current1RM > 0,
    };
  }

  const prevBest = getBestTopSet(prevSets)!;
  const prevVolumeKg = calculateWorkingVolumeKg(prevSets);
  const prev1RM = estimate1RM(toKg(prevBest.weight, prevBest.unit), prevBest.reps);

  const deltaWeight = Number(
    ((currBest?.weight ?? 0) - prevBest.weight).toFixed(2)
  );
  const deltaReps = (currBest?.reps ?? 0) - prevBest.reps;
  const delta1RM = Number((current1RM - prev1RM).toFixed(1));
  const deltaVolumePct =
    prevVolumeKg > 0
      ? Math.round(((currentVolumeKg - prevVolumeKg) / prevVolumeKg) * 100)
      : 0;

  return {
    hasPrevious: true,
    previousDate: prevDate,
    prevBestWeight: prevBest.weight,
    prevBestReps: prevBest.reps,
    prevUnit: prevBest.unit,
    prevVolumeKg,
    prev1RM,
    currentBestWeight: currBest?.weight ?? 0,
    currentBestReps: currBest?.reps ?? 0,
    currentVolumeKg,
    current1RM,
    deltaWeight,
    deltaReps,
    deltaVolumePct,
    delta1RM,
    isPR: current1RM > prev1RM,
  };
}
