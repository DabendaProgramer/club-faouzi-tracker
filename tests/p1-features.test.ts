import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRESET_EXERCISES } from "@/data/presets";
import {
  DEFAULT_CUSTOM_DAYS,
  mergeExercisesWithPresets,
  resolveCloudHydrationState,
} from "@/lib/auth-state";
import type { CustomSplitDay, Exercise } from "@/types/workout";

type QueryError = { message: string } | null;
type QueryResult<T = unknown> = { data: T; error: QueryError };

function createQueryBuilder<T = unknown>(result: QueryResult<T>) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (
      onFulfilled?: (value: QueryResult<T>) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

const { mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: mockFrom,
    auth: { getSession: mockGetSession },
  },
}));

import {
  fetchCloudData,
  fetchCoachClients,
  linkCoachByCode,
  saveCustomExercisesToCloud,
  saveCustomSplitDaysToCloud,
} from "@/lib/supabase-sync";

beforeEach(() => {
  mockFrom.mockReset();
  mockGetSession.mockReset();
});

describe("P1-1: linkCoachByCode & fetchCloudData coach resolution", () => {
  it("rejects empty or whitespace coach codes without querying Supabase", async () => {
    const res = await linkCoachByCode("athlete-1", "   ");
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests (empty userId) without querying Supabase", async () => {
    const res = await linkCoachByCode("", "FAOUZI-PRO");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Connectez-vous");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns error when coach code is not found", async () => {
    const lookupBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValueOnce(lookupBuilder);

    const res = await linkCoachByCode("athlete-1", "UNKNOWN-99");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("introuvable");
    expect(lookupBuilder.eq).toHaveBeenCalledWith("coach_code", "UNKNOWN-99");
  });

  it("prevents self-linking when coachRow.id equals userId", async () => {
    const lookupBuilder = createQueryBuilder({
      data: {
        id: "user-1",
        display_name: "Coach Faouzi",
        coach_code: "FAOUZI-1",
      },
      error: null,
    });
    mockFrom.mockReturnValueOnce(lookupBuilder);

    const res = await linkCoachByCode("user-1", "faouzi-1");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("propre code coach");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("returns error when lookup or profile update fails in DB", async () => {
    const lookupErrorBuilder = createQueryBuilder({
      data: null,
      error: { message: "db error" },
    });
    mockFrom.mockReturnValueOnce(lookupErrorBuilder);

    const res1 = await linkCoachByCode("athlete-1", "FAOUZI-PRO");
    expect(res1.ok).toBe(false);
    expect(res1.error).toBeTruthy();

    const lookupOkBuilder = createQueryBuilder({
      data: {
        id: "coach-1",
        display_name: "Coach Faouzi",
        coach_code: "FAOUZI-PRO",
      },
      error: null,
    });
    const updateErrBuilder = createQueryBuilder({
      data: null,
      error: { message: "update failed" },
    });
    mockFrom
      .mockReturnValueOnce(lookupOkBuilder)
      .mockReturnValueOnce(updateErrBuilder);

    const res2 = await linkCoachByCode("athlete-1", "FAOUZI-PRO");
    expect(res2.ok).toBe(false);
    expect(res2.error).toContain("Impossible");
  });

  it("links valid normalized coach code and returns coachName & coachCode", async () => {
    const lookupBuilder = createQueryBuilder({
      data: {
        id: "coach-99",
        display_name: "Coach Faouzi",
        coach_code: "FAOUZI-PRO",
      },
      error: null,
    });
    const updateBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(lookupBuilder)
      .mockReturnValueOnce(updateBuilder);

    const res = await linkCoachByCode("athlete-1", "  faouzi-pro ");
    expect(res).toEqual({
      ok: true,
      coachName: "Coach Faouzi",
      coachCode: "FAOUZI-PRO",
    });
    expect(lookupBuilder.eq).toHaveBeenCalledWith("coach_code", "FAOUZI-PRO");
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ coach_id: "coach-99" })
    );
    expect(updateBuilder.eq).toHaveBeenCalledWith("id", "athlete-1");
  });

  it("fetchCloudData resolves profile.coach_id to linkedCoachName and coachCode", async () => {
    const profileBuilder = createQueryBuilder({
      data: {
        id: "athlete-1",
        email: "athlete@test.com",
        display_name: "Yassine",
        role: "athlete",
        coach_id: "coach-99",
        coach_code: null,
        onboarding_completed: true,
        subscription_tier: "free",
        split_mode: "11-day",
        current_cycle_day: 1,
        rounding_step: 0.5,
        preferred_unit: "kg",
        default_rest_seconds: 120,
      },
      error: null,
    });
    const emptyListBuilder = createQueryBuilder({ data: [], error: null });
    const coachProfileBuilder = createQueryBuilder({
      data: {
        display_name: "Coach Faouzi",
        coach_code: "FAOUZI-PRO",
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        // First call is athlete profile, second call is coach lookup
        return mockFrom.mock.calls.filter((c) => c[0] === "profiles")
          .length === 1
          ? profileBuilder
          : coachProfileBuilder;
      }
      return emptyListBuilder;
    });

    const cloud = await fetchCloudData("athlete-1");
    expect(cloud.settingsPartial?.coachCode).toBe("FAOUZI-PRO");
    expect(cloud.settingsPartial?.linkedCoachName).toBe("Coach Faouzi");
  });
});

describe("P1-2: Custom exercises & split days Supabase sync", () => {
  const customEx: Exercise = {
    id: "custom-1700000000",
    name: "Belt Squat",
    muscleGroup: "Legs",
    defaultUnit: "kg",
    isEachSide: false,
    notes: "Tempo contrôlé",
    defaultSets: [
      {
        id: "s1",
        setType: "top_set",
        label: "Top Set",
        targetReps: 8,
        unit: "kg",
      },
    ],
  };

  it("saveCustomExercisesToCloud filters out PRESET_EXERCISES and upserts only custom exercises", async () => {
    const upsertBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValueOnce(upsertBuilder);

    await saveCustomExercisesToCloud("user-1", [
      customEx,
      ...PRESET_EXERCISES.slice(0, 3),
    ]);

    expect(mockFrom).toHaveBeenCalledWith("custom_exercises");
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: "user-1",
          exercise_id: "custom-1700000000",
          name: "Belt Squat",
          muscle_group: "Legs",
        }),
      ],
      { onConflict: "user_id,exercise_id" }
    );
  });

  it("saveCustomExercisesToCloud skips upsert when only preset exercises exist", async () => {
    await saveCustomExercisesToCloud("user-1", PRESET_EXERCISES.slice(0, 2));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("saveCustomSplitDaysToCloud upserts days and prunes deleted day_index rows", async () => {
    const upsertBuilder = createQueryBuilder({ data: null, error: null });
    const pruneBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom
      .mockReturnValueOnce(upsertBuilder)
      .mockReturnValueOnce(pruneBuilder);

    const days: CustomSplitDay[] = [
      {
        dayIndex: 1,
        dayLabel: "Jour 1",
        title: "Upper",
        isRest: false,
        exerciseIds: ["ez-bar-curl"],
      },
      {
        dayIndex: 2,
        dayLabel: "Jour 2",
        title: "Repos",
        isRest: true,
        exerciseIds: [],
      },
    ];

    await saveCustomSplitDaysToCloud("user-1", days);

    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: "user-1",
          day_index: 1,
          title: "Upper",
        }),
        expect.objectContaining({
          user_id: "user-1",
          day_index: 2,
          is_rest: true,
        }),
      ]),
      { onConflict: "user_id,day_index" }
    );
    expect(pruneBuilder.delete).toHaveBeenCalled();
    expect(pruneBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(pruneBuilder.not).toHaveBeenCalledWith("day_index", "in", "(1,2)");
  });

  it("saveCustomSplitDaysToCloud deletes all rows when customDays is empty", async () => {
    const deleteBuilder = createQueryBuilder({ data: null, error: null });
    mockFrom.mockReturnValueOnce(deleteBuilder);

    await saveCustomSplitDaysToCloud("user-1", []);

    expect(mockFrom).toHaveBeenCalledWith("custom_split_days");
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("fetchCloudData maps custom_exercises and custom_split_days and resolveCloudHydrationState merges with presets", async () => {
    const profileBuilder = createQueryBuilder({
      data: {
        id: "user-1",
        email: "u@test.com",
        display_name: "User",
        role: "athlete",
        onboarding_completed: true,
        subscription_tier: "free",
        split_mode: "custom",
        current_cycle_day: 1,
        rounding_step: 0.5,
        preferred_unit: "kg",
        default_rest_seconds: 120,
      },
      error: null,
    });
    const emptyBuilder = createQueryBuilder({ data: [], error: null });
    const customExBuilder = createQueryBuilder({
      data: [
        {
          exercise_id: "custom-1",
          name: "Pendulum Squat",
          muscle_group: "Legs",
          default_unit: "kg",
          is_each_side: false,
          notes: "Deep",
          audio_memo_label: null,
          min_pr_reps: 8,
          default_sets: [],
        },
      ],
      error: null,
    });
    const customDaysBuilder = createQueryBuilder({
      data: [
        {
          day_index: 1,
          day_label: "Jour 1",
          title: "Legs Perso",
          is_rest: false,
          pre_workout_note: "Focus",
          exercise_ids: ["custom-1", "squats"],
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileBuilder;
      if (table === "custom_exercises") return customExBuilder;
      if (table === "custom_split_days") return customDaysBuilder;
      return emptyBuilder;
    });

    const cloud = await fetchCloudData("user-1");
    expect(cloud.customExercises).toHaveLength(1);
    expect(cloud.customExercises?.[0].id).toBe("custom-1");
    expect(cloud.customSplitDays).toHaveLength(1);
    expect(cloud.customSplitDays?.[0].title).toBe("Legs Perso");

    const hydrated = resolveCloudHydrationState(cloud, "u@test.com");
    expect(hydrated.exercises[0].id).toBe("custom-1");
    expect(hydrated.exercises.length).toBe(PRESET_EXERCISES.length + 1);
    expect(hydrated.customDays).toEqual(cloud.customSplitDays);

    // Deduplicates preset IDs and falls back to defaults when empty
    const merged = mergeExercisesWithPresets([
      PRESET_EXERCISES[0],
      customEx,
      customEx,
    ]);
    expect(merged.filter((e) => e.id === PRESET_EXERCISES[0].id)).toHaveLength(1);
    expect(merged.filter((e) => e.id === customEx.id)).toHaveLength(1);

    const fallback = resolveCloudHydrationState({}, "u@test.com");
    expect(fallback.exercises).toEqual(PRESET_EXERCISES);
    expect(fallback.customDays).toEqual(DEFAULT_CUSTOM_DAYS);
  });
});

describe("P1-3: fetchCoachClients returns full checkIns[] ordered descending", () => {
  it("collects all check-ins per athlete sorted descending by created_at and handles empty check-ins", async () => {
    const profilesBuilder = createQueryBuilder({
      data: [
        {
          id: "ath-1",
          display_name: "Yassine",
          email: "yassine@test.com",
          subscription_tier: "pro",
        },
        {
          id: "ath-2",
          display_name: "Karim",
          email: "karim@test.com",
          subscription_tier: "free",
        },
      ],
      error: null,
    });
    const emptyBuilder = createQueryBuilder({ data: [], error: null });
    const checkinsBuilder = createQueryBuilder({
      data: [
        {
          id: "chk-old",
          user_id: "ath-1",
          created_at: "2026-11-10T10:00:00.000Z",
          full_name: "Yassine",
          muscle_group: "Biceps",
          sleep_quality: 6,
          stress: 5,
          energy: 6,
          motivation: 7,
          readiness_score: 68,
          hydrated: true,
          caffeine_pre: false,
          caffeine_earlier: false,
          caffeine_day_before: false,
        },
        {
          id: "chk-newest",
          user_id: "ath-1",
          created_at: "2026-11-18T10:00:00.000Z",
          full_name: "Yassine",
          muscle_group: "Dos",
          sleep_quality: 9,
          stress: 2,
          energy: 9,
          motivation: 9,
          readiness_score: 92,
          hydrated: true,
          caffeine_pre: true,
          caffeine_time: "17:00",
          caffeine_earlier: false,
          caffeine_day_before: false,
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profilesBuilder;
      if (table === "coaching_checkins") return checkinsBuilder;
      return emptyBuilder;
    });

    const clients = await fetchCoachClients("coach-1");
    expect(clients).toHaveLength(2);

    const yassine = clients.find((c) => c.id === "ath-1");
    expect(yassine?.checkIns).toHaveLength(2);
    expect(yassine?.checkIns[0].id).toBe("chk-newest");
    expect(yassine?.checkIns[1].id).toBe("chk-old");
    expect(yassine?.latestCheckIn?.id).toBe("chk-newest");

    const karim = clients.find((c) => c.id === "ath-2");
    expect(karim?.checkIns).toEqual([]);
    expect(karim?.latestCheckIn).toBeUndefined();
  });
});
