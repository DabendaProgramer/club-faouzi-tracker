import { INITIAL_DEMO_SESSIONS, PRESET_EXERCISES } from "@/data/presets";
import {
  CoachingCheckIn,
  Exercise,
  LoggedSet,
  SplitDay,
  UnlockedBadge,
  UserSettings,
  WorkoutSession,
} from "@/types/workout";

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: "Athlète Faouzi",
  email: "",
  role: "athlete",
  onboardingCompleted: false,
  tier: "free",
  splitMode: "11-day",
  currentCycleDay: 1,
  roundingStep: 0.5,
  preferredUnit: "kg",
  defaultRestSeconds: 120,
};

export const DEFAULT_CUSTOM_DAYS: SplitDay[] = [
  {
    dayIndex: 1,
    dayLabel: "Jour 1",
    title: "Séance Perso A",
    isRest: false,
    exerciseIds: ["ez-bar-curl", "lat-pulldown"],
  },
  {
    dayIndex: 2,
    dayLabel: "Jour 2",
    title: "Repos",
    isRest: true,
    exerciseIds: [],
  },
];

export function canUseDemoTierToggle(
  settings: Pick<UserSettings, "email">
): boolean {
  return !settings.email.trim();
}

export function resolveAuthenticatedSettings(
  cloudSettingsPartial: Partial<UserSettings> | undefined,
  userEmail?: string,
  userFullName?: string
): UserSettings {
  if (cloudSettingsPartial) {
    return {
      ...DEFAULT_SETTINGS,
      ...cloudSettingsPartial,
      email: cloudSettingsPartial.email || userEmail || "",
      displayName:
        cloudSettingsPartial.displayName ||
        userFullName ||
        DEFAULT_SETTINGS.displayName,
      tier: cloudSettingsPartial.tier === "pro" ? "pro" : "free",
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    email: userEmail || "",
    displayName: userFullName || DEFAULT_SETTINGS.displayName,
    tier: "free",
    onboardingCompleted: false,
  };
}

export function mergeExercisesWithPresets(
  customExercises?: Exercise[]
): Exercise[] {
  if (!customExercises || customExercises.length === 0) {
    return PRESET_EXERCISES;
  }
  const presetIds = new Set(PRESET_EXERCISES.map((p) => p.id));
  const seen = new Set<string>();
  const uniqueCustom = customExercises.filter((ex) => {
    if (presetIds.has(ex.id) || seen.has(ex.id)) return false;
    seen.add(ex.id);
    return true;
  });
  return [...uniqueCustom, ...PRESET_EXERCISES];
}

export function resolveCloudHydrationState(
  cloud: {
    settingsPartial?: Partial<UserSettings>;
    sessions?: WorkoutSession[];
    badges?: UnlockedBadge[];
    customExercises?: Exercise[];
    customSplitDays?: SplitDay[];
  },
  userEmail?: string,
  userFullName?: string
) {
  const settings = resolveAuthenticatedSettings(
    cloud.settingsPartial,
    userEmail,
    userFullName
  );
  return {
    settings,
    history: cloud.sessions ?? [],
    badges: cloud.badges ?? [],
    exercises: mergeExercisesWithPresets(cloud.customExercises),
    customDays:
      cloud.customSplitDays && cloud.customSplitDays.length > 0
        ? cloud.customSplitDays
        : DEFAULT_CUSTOM_DAYS,
    entryMode: settings.onboardingCompleted
      ? ("app" as const)
      : ("onboarding" as const),
    initialTab:
      settings.role === "coach" ? ("coach_athletes" as const) : undefined,
  };
}

export function resolveDemoEntryState(prevSettings: UserSettings) {
  return {
    settings: {
      ...prevSettings,
      onboardingCompleted: true,
      tier: "pro" as const,
    },
    history: INITIAL_DEMO_SESSIONS,
    entryMode: "app" as const,
  };
}

export function resolveAuthSuccessState(email: string) {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      email,
      tier: "free" as const,
      onboardingCompleted: false,
    },
    history: [] as WorkoutSession[],
    badges: [] as UnlockedBadge[],
    entryMode: "onboarding" as const,
  };
}

export function createSignedOutResetState() {
  return {
    settings: DEFAULT_SETTINGS,
    exercises: PRESET_EXERCISES as Exercise[],
    customDays: DEFAULT_CUSTOM_DAYS,
    history: [] as WorkoutSession[],
    badges: [] as UnlockedBadge[],
    checkIns: [] as CoachingCheckIn[],
    activeSets: [] as LoggedSet[],
    todayCheckIn: null as CoachingCheckIn | null,
    tab: "workout" as const,
    entryMode: "landing" as const,
  };
}
