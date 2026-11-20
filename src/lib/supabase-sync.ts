import { supabase } from "@/lib/supabase";
import {
  CoachClientSummary,
  CoachingCheckIn,
  CustomSplitDay,
  Exercise,
  FaouziRank,
  MuscleGroup,
  SetTemplate,
  UnlockedBadge,
  UserSettings,
  WeightUnit,
  WorkoutSession,
} from "@/types/workout";
import { getBestTopSet } from "@/lib/workout-engine";
import { RANK_ORDER } from "@/data/performance-chart";
import { PRESET_EXERCISES } from "@/data/presets";

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function syncProfileSettingsToCloud(
  userId: string,
  settings: UserSettings
): Promise<void> {
  if (!supabase) return;

  let resolvedCoachId: string | null = null;
  if (settings.role === "athlete" && settings.coachCode?.trim()) {
    const { data: coachRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("coach_code", settings.coachCode.trim().toUpperCase())
      .maybeSingle();
    resolvedCoachId = coachRow?.id ?? null;
  }

  const coachCodeToSave =
    settings.role === "coach"
      ? settings.coachCode || `FAOUZI-${userId.slice(0, 4).toUpperCase()}`
      : undefined;

  await supabase.from("profiles").upsert({
    id: userId,
    email: settings.email || null,
    display_name: settings.displayName,
    role: settings.role,
    ...(resolvedCoachId ? { coach_id: resolvedCoachId } : {}),
    ...(coachCodeToSave ? { coach_code: coachCodeToSave } : {}),
    onboarding_completed: settings.onboardingCompleted,
    split_mode: settings.splitMode,
    current_cycle_day: settings.currentCycleDay,
    rounding_step: settings.roundingStep,
    preferred_unit: settings.preferredUnit,
    default_rest_seconds: settings.defaultRestSeconds,
    updated_at: new Date().toISOString(),
  });
}

export async function linkCoachByCode(
  userId: string,
  coachCode: string
): Promise<{
  ok: boolean;
  coachName?: string;
  coachCode?: string;
  error?: string;
}> {
  const normalized = coachCode.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, error: "Veuillez saisir un code coach." };
  }
  if (!supabase) {
    return {
      ok: false,
      error: "Supabase non configuré : liaison coach impossible en mode local.",
    };
  }
  if (!userId) {
    return {
      ok: false,
      error: "Connectez-vous à votre compte pour lier un coach.",
    };
  }

  const { data: coachRow, error: lookupError } = await supabase
    .from("profiles")
    .select("id, display_name, coach_code")
    .eq("coach_code", normalized)
    .maybeSingle();

  if (lookupError) {
    return {
      ok: false,
      error: "Erreur lors de la vérification du code coach.",
    };
  }
  if (!coachRow) {
    return {
      ok: false,
      error: "Code coach introuvable. Vérifiez le code auprès de votre coach.",
    };
  }
  if (coachRow.id === userId) {
    return {
      ok: false,
      error: "Vous ne pouvez pas utiliser votre propre code coach.",
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      coach_id: coachRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    return {
      ok: false,
      error: "Impossible d'enregistrer le lien avec ce coach.",
    };
  }

  return {
    ok: true,
    coachName: (coachRow.display_name as string | null) || "Coach",
    coachCode: (coachRow.coach_code as string | null) || normalized,
  };
}

export async function saveSessionToCloud(
  userId: string,
  session: WorkoutSession
): Promise<void> {
  if (!supabase) return;
  const { data: insertedSession, error: sessError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      day_title: session.dayTitle,
      split_day_index: session.splitDayIndex ?? null,
      duration_minutes: session.durationMinutes ?? null,
      started_at: session.date,
    })
    .select("id")
    .single();

  if (sessError || !insertedSession) return;

  if (session.sets.length > 0) {
    await supabase.from("workout_sets").insert(
      session.sets.map((s) => ({
        session_id: insertedSession.id,
        user_id: userId,
        exercise_id: s.exerciseId,
        exercise_name: s.exerciseName,
        muscle_group: s.muscleGroup,
        set_type: s.setType,
        weight: s.weight,
        unit: s.unit,
        is_empty_bar: s.isEmptyBar,
        is_each_side: s.isEachSide,
        reps: s.reps,
        unlocked_rank: s.unlockedRank ?? null,
        completed_at: s.completedAt,
      }))
    );
  }
}

export async function saveCheckInToCloud(
  userId: string,
  checkIn: CoachingCheckIn
): Promise<void> {
  if (!supabase) return;
  await supabase.from("coaching_checkins").insert({
    user_id: userId,
    full_name: checkIn.fullName,
    muscle_group: checkIn.muscleGroup,
    sleep_start: checkIn.sleepStart,
    sleep_end: checkIn.sleepEnd,
    sleep_quality: checkIn.sleepQuality,
    sleep_disruptors: checkIn.sleepDisruptors,
    pre_workout_meal: checkIn.preWorkoutMeal,
    hydrated: checkIn.hydrated,
    caffeine_pre: checkIn.caffeinePre,
    caffeine_time: checkIn.caffeineTime ?? null,
    caffeine_earlier: checkIn.caffeineEarlier,
    caffeine_day_before: checkIn.caffeineDayBefore,
    stress: checkIn.stress,
    energy: checkIn.energy,
    motivation: checkIn.motivation,
    session_time: checkIn.sessionTime ?? null,
    first_working_set_time: checkIn.firstWorkingSetTime ?? null,
    intensity: checkIn.intensity ?? null,
    negative_factors: checkIn.negativeFactors ?? null,
    readiness_score: checkIn.readinessScore,
  });
}

export async function saveBadgeToCloud(
  userId: string,
  badge: UnlockedBadge
): Promise<void> {
  if (!supabase) return;
  await supabase.from("unlocked_badges").insert({
    user_id: userId,
    rank: badge.rank,
    muscle_group: badge.muscleGroup,
    exercise_name: badge.exerciseName,
    weight_kg: badge.weightKg,
    reps: badge.reps,
    unlocked_at: badge.unlockedAt,
  });
}

export async function saveCustomExercisesToCloud(
  userId: string,
  exercises: Exercise[]
): Promise<void> {
  if (!supabase || !userId) return;
  const presetIds = new Set(PRESET_EXERCISES.map((p) => p.id));
  const customOnly = exercises.filter((ex) => !presetIds.has(ex.id));
  if (customOnly.length === 0) return;

  await supabase.from("custom_exercises").upsert(
    customOnly.map((ex) => ({
      user_id: userId,
      exercise_id: ex.id,
      name: ex.name,
      muscle_group: ex.muscleGroup,
      default_unit: ex.defaultUnit,
      is_each_side: Boolean(ex.isEachSide),
      notes: ex.notes ?? null,
      audio_memo_label: ex.audioMemoLabel ?? null,
      min_pr_reps: ex.minPrReps ?? null,
      default_sets: ex.defaultSets,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,exercise_id" }
  );
}

export async function saveCustomSplitDaysToCloud(
  userId: string,
  customDays: CustomSplitDay[]
): Promise<void> {
  if (!supabase || !userId) return;

  if (customDays.length === 0) {
    await supabase
      .from("custom_split_days")
      .delete()
      .eq("user_id", userId);
    return;
  }

  const { error } = await supabase.from("custom_split_days").upsert(
    customDays.map((d) => ({
      user_id: userId,
      day_index: d.dayIndex,
      day_label: d.dayLabel,
      title: d.title,
      is_rest: d.isRest,
      pre_workout_note: d.preWorkoutNote ?? null,
      exercise_ids: d.exerciseIds,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,day_index" }
  );

  if (!error) {
    const activeIndices = customDays.map((d) => d.dayIndex);
    await supabase
      .from("custom_split_days")
      .delete()
      .eq("user_id", userId)
      .not("day_index", "in", `(${activeIndices.join(",")})`);
  }
}

export async function fetchCloudData(userId: string): Promise<{
  settingsPartial?: Partial<UserSettings>;
  sessions?: WorkoutSession[];
  badges?: UnlockedBadge[];
  customExercises?: Exercise[];
  customSplitDays?: CustomSplitDay[];
}> {
  if (!supabase) return {};

  const [
    { data: profile },
    { data: sessions },
    { data: sets },
    { data: badges },
    { data: customExerciseRows },
    { data: customSplitDayRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("workout_sets")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: true }),
    supabase
      .from("unlocked_badges")
      .select("*")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false }),
    supabase
      .from("custom_exercises")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("custom_split_days")
      .select("*")
      .eq("user_id", userId)
      .order("day_index", { ascending: true }),
  ]);

  let linkedCoachName: string | undefined;
  let linkedCoachCode: string | undefined;
  if (profile && profile.role !== "coach" && profile.coach_id) {
    const { data: coachProf } = await supabase
      .from("profiles")
      .select("display_name, coach_code")
      .eq("id", profile.coach_id)
      .maybeSingle();
    if (coachProf) {
      linkedCoachName = (coachProf.display_name as string | null) ?? undefined;
      linkedCoachCode = (coachProf.coach_code as string | null) ?? undefined;
    }
  }

  const settingsPartial: Partial<UserSettings> | undefined = profile
    ? {
        displayName: profile.display_name ?? undefined,
        email: profile.email ?? undefined,
        role: profile.role === "coach" ? "coach" : "athlete",
        coachCode:
          profile.role === "coach"
            ? (profile.coach_code ?? undefined)
            : linkedCoachCode,
        linkedCoachName:
          profile.role === "coach" ? undefined : linkedCoachName,
        onboardingCompleted: Boolean(profile.onboarding_completed),
        tier: profile.subscription_tier === "pro" ? "pro" : "free",
        splitMode: profile.split_mode === "custom" ? "custom" : "11-day",
        currentCycleDay: profile.current_cycle_day ?? 1,
        roundingStep: profile.rounding_step ?? 0.5,
        preferredUnit: profile.preferred_unit === "lbs" ? "lbs" : "kg",
        defaultRestSeconds: profile.default_rest_seconds ?? 120,
      }
    : undefined;

  const mappedSessions: WorkoutSession[] | undefined = sessions
    ? sessions.map((sess) => ({
        id: sess.id,
        date: sess.started_at,
        dayTitle: sess.day_title,
        splitDayIndex: sess.split_day_index ?? undefined,
        durationMinutes: sess.duration_minutes ?? undefined,
        sets: (sets ?? [])
          .filter((st) => st.session_id === sess.id)
          .map((st) => ({
            id: st.id,
            exerciseId: st.exercise_id,
            exerciseName: st.exercise_name,
            muscleGroup: st.muscle_group,
            setType: st.set_type,
            weight: Number(st.weight),
            unit: st.unit,
            isEmptyBar: st.is_empty_bar,
            isEachSide: st.is_each_side,
            reps: st.reps,
            unlockedRank: st.unlocked_rank,
            completedAt: st.completed_at,
          })),
      }))
    : undefined;

  const mappedBadges: UnlockedBadge[] | undefined = badges
    ? badges.map((b) => ({
        id: b.id,
        rank: b.rank,
        muscleGroup: b.muscle_group,
        exerciseName: b.exercise_name,
        weightKg: Number(b.weight_kg),
        reps: b.reps,
        unlockedAt: b.unlocked_at,
      }))
    : undefined;

  const mappedCustomExercises: Exercise[] | undefined = customExerciseRows
    ? customExerciseRows.map((ex) => ({
        id: ex.exercise_id as string,
        name: ex.name as string,
        muscleGroup: ex.muscle_group as MuscleGroup,
        defaultUnit: (ex.default_unit === "lbs" ? "lbs" : "kg") as WeightUnit,
        isEachSide: Boolean(ex.is_each_side),
        notes: (ex.notes as string | null) ?? undefined,
        audioMemoLabel: (ex.audio_memo_label as string | null) ?? undefined,
        minPrReps: (ex.min_pr_reps as number | null) ?? undefined,
        defaultSets: Array.isArray(ex.default_sets)
          ? (ex.default_sets as SetTemplate[])
          : [],
      }))
    : undefined;

  const mappedCustomSplitDays: CustomSplitDay[] | undefined = customSplitDayRows
    ? customSplitDayRows.map((d) => ({
        dayIndex: Number(d.day_index),
        dayLabel: d.day_label as string,
        title: d.title as string,
        isRest: Boolean(d.is_rest),
        preWorkoutNote: (d.pre_workout_note as string | null) ?? undefined,
        exerciseIds: Array.isArray(d.exercise_ids)
          ? (d.exercise_ids as string[])
          : [],
      }))
    : undefined;

  return {
    settingsPartial,
    sessions: mappedSessions,
    badges: mappedBadges,
    customExercises: mappedCustomExercises,
    customSplitDays: mappedCustomSplitDays,
  };
}

export interface CloudCoachClient extends CoachClientSummary {
  sessions: WorkoutSession[];
}

export async function fetchCoachClients(
  coachUserId: string
): Promise<CloudCoachClient[]> {
  if (!supabase) return [];

  const { data: athleteProfiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("coach_id", coachUserId);

  if (!athleteProfiles || athleteProfiles.length === 0) return [];

  const athleteIds = athleteProfiles.map((p) => p.id as string);

  const [{ data: sessions }, { data: sets }, { data: checkins }, { data: badges }] =
    await Promise.all([
      supabase
        .from("workout_sessions")
        .select("*")
        .in("user_id", athleteIds)
        .order("started_at", { ascending: false }),
      supabase
        .from("workout_sets")
        .select("*")
        .in("user_id", athleteIds)
        .order("completed_at", { ascending: true }),
      supabase
        .from("coaching_checkins")
        .select("*")
        .in("user_id", athleteIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("unlocked_badges")
        .select("*")
        .in("user_id", athleteIds),
    ]);

  return athleteProfiles.map((prof) => {
    const uid = prof.id as string;
    const mySessions: WorkoutSession[] = (sessions ?? [])
      .filter((s) => s.user_id === uid)
      .map((sess) => ({
        id: sess.id,
        date: sess.started_at,
        dayTitle: sess.day_title,
        splitDayIndex: sess.split_day_index ?? undefined,
        sets: (sets ?? [])
          .filter((st) => st.session_id === sess.id)
          .map((st) => ({
            id: st.id,
            exerciseId: st.exercise_id,
            exerciseName: st.exercise_name,
            muscleGroup: st.muscle_group,
            setType: st.set_type,
            weight: Number(st.weight),
            unit: st.unit,
            isEmptyBar: st.is_empty_bar,
            isEachSide: st.is_each_side,
            reps: st.reps,
            unlockedRank: st.unlocked_rank,
            completedAt: st.completed_at,
          })),
      }));

    const latestSess = mySessions[0];
    const best = latestSess ? getBestTopSet(latestSess.sets) : null;

    const myBadges = (badges ?? []).filter((b) => b.user_id === uid);
    let highestRank: FaouziRank = "Iron";
    for (const b of myBadges) {
      if (
        RANK_ORDER.indexOf(b.rank as FaouziRank) >
        RANK_ORDER.indexOf(highestRank)
      ) {
        highestRank = b.rank as FaouziRank;
      }
    }

    const mappedCheckIns: CoachingCheckIn[] = (checkins ?? [])
      .filter((c) => c.user_id === uid)
      .sort(
        (a, b) =>
          new Date(b.created_at as string).getTime() -
          new Date(a.created_at as string).getTime()
      )
      .map((chk) => ({
        id: chk.id,
        date: chk.created_at,
        fullName: chk.full_name,
        muscleGroup: chk.muscle_group,
        sleepStart: chk.sleep_start ?? "23:30",
        sleepEnd: chk.sleep_end ?? "07:30",
        sleepQuality: chk.sleep_quality ?? 7,
        sleepDisruptors: chk.sleep_disruptors ?? [],
        preWorkoutMeal: chk.pre_workout_meal ?? "breakfast_and_pre",
        hydrated: Boolean(chk.hydrated),
        caffeinePre: Boolean(chk.caffeine_pre),
        caffeineTime: chk.caffeine_time ?? undefined,
        caffeineEarlier: Boolean(chk.caffeine_earlier),
        caffeineDayBefore: Boolean(chk.caffeine_day_before),
        stress: chk.stress ?? 4,
        energy: chk.energy ?? 7,
        motivation: chk.motivation ?? 8,
        sessionTime: chk.session_time ?? undefined,
        firstWorkingSetTime: chk.first_working_set_time ?? undefined,
        intensity: chk.intensity ?? undefined,
        negativeFactors: chk.negative_factors ?? undefined,
        readinessScore: chk.readiness_score ?? 75,
      }));

    return {
      id: uid,
      fullName: prof.display_name || prof.email || "Athlète",
      email: prof.email || "",
      tier: prof.subscription_tier === "pro" ? "pro" : "free",
      highestRank,
      latestSessionTitle: latestSess?.dayTitle,
      latestSessionDate: latestSess?.date,
      latestTopSetLabel: best
        ? `${best.exerciseName} · ${best.weight}${best.unit} × ${best.reps}`
        : undefined,
      latestCheckIn: mappedCheckIns[0],
      checkIns: mappedCheckIns,
      sessions: mySessions,
    };
  });
}
