export type WeightUnit = "kg" | "lbs";

export type RoundingStep = 0.5 | 1 | 2.5;

export type SetType =
  | "warmup"
  | "activation"
  | "top_set"
  | "backoff"
  | "working";

export type MuscleGroup =
  | "Biceps"
  | "Épaules"
  | "Triceps"
  | "Dos"
  | "Chest"
  | "Legs";

export type FaouziRank =
  | "Iron"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Diamond"
  | "Master";

export interface SetTemplate {
  id: string;
  setType: SetType;
  label: string;
  targetWeight?: number;
  targetReps?: number;
  minPrReps?: number;
  isEmptyBar?: boolean;
  isEachSide?: boolean;
  unit: WeightUnit;
  backoffRatio?: number; // e.g., 0.85
  note?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultUnit: WeightUnit;
  isEachSide?: boolean;
  notes?: string;
  audioMemoLabel?: string;
  minPrReps?: number;
  defaultSets: SetTemplate[];
}

export interface SplitDay {
  dayIndex: number; // 1..11 for 11-day split or 1..N for custom
  dayLabel: string; // e.g. "Jour 1 · Lundi"
  title: string; // e.g. "Biceps", "Rest", "Legs"
  isRest: boolean;
  preWorkoutNote?: string;
  exerciseIds: string[];
}

export interface LoggedSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  setType: SetType;
  weight: number;
  unit: WeightUnit;
  isEmptyBar: boolean;
  isEachSide: boolean;
  reps: number;
  targetReps?: number;
  minPrReps?: number;
  completedAt: string;
  unlockedRank?: FaouziRank | null;
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO string
  dayTitle: string;
  splitDayIndex?: number;
  sets: LoggedSet[];
  durationMinutes?: number;
}

export interface RankThreshold {
  rank: FaouziRank;
  weightKg: number;
  reps: number;
}

export interface ChartExerciseRule {
  exerciseKey: string;
  displayName: string;
  muscleGroup: MuscleGroup;
  thresholds: RankThreshold[];
}

export interface UnlockedBadge {
  id: string;
  rank: FaouziRank;
  muscleGroup: MuscleGroup;
  exerciseName: string;
  weightKg: number;
  reps: number;
  unlockedAt: string;
}

export interface MobilityExercise {
  id: string;
  name: string;
  timestampRef?: string; // e.g. "1:18"
  durationSeconds: number;
  setsRange: string; // e.g. "2 fois" or "2-3 fois"
  targetSets: number;
  phase: "pre" | "post";
}

export type SubscriptionTier = "free" | "pro";

export interface UserSettings {
  displayName: string;
  email: string;
  tier: SubscriptionTier;
  splitMode: "11-day" | "custom";
  currentCycleDay: number; // 1..11
  roundingStep: RoundingStep;
  preferredUnit: WeightUnit;
  defaultRestSeconds: number;
}
