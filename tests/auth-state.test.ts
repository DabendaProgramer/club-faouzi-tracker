import { describe, expect, it } from "vitest";
import { INITIAL_DEMO_SESSIONS, PRESET_EXERCISES } from "@/data/presets";
import {
  canUseDemoTierToggle,
  createSignedOutResetState,
  DEFAULT_CUSTOM_DAYS,
  DEFAULT_SETTINGS,
  resolveAuthenticatedSettings,
  resolveAuthSuccessState,
  resolveCloudHydrationState,
  resolveDemoEntryState,
} from "@/lib/auth-state";
import type { UnlockedBadge, WorkoutSession } from "@/types/workout";

describe("P0-1: New signups start in free tier and client toggle is guarded", () => {
  it("sets DEFAULT_SETTINGS.tier to 'free' and onboardingCompleted to false", () => {
    expect(DEFAULT_SETTINGS.tier).toBe("free");
    expect(DEFAULT_SETTINGS.onboardingCompleted).toBe(false);
  });

  it("resolves new authenticated user without cloud profile to 'free' tier", () => {
    const resolved = resolveAuthenticatedSettings(
      undefined,
      "newuser@example.com",
      "New User"
    );

    expect(resolved.tier).toBe("free");
    expect(resolved.onboardingCompleted).toBe(false);
    expect(resolved.email).toBe("newuser@example.com");
    expect(resolved.displayName).toBe("New User");
  });

  it("preserves 'pro' tier only when explicitly returned by cloud profile", () => {
    const resolvedPro = resolveAuthenticatedSettings(
      { tier: "pro", onboardingCompleted: true },
      "pro@example.com"
    );
    expect(resolvedPro.tier).toBe("pro");
    expect(resolvedPro.onboardingCompleted).toBe(true);

    const resolvedFree = resolveAuthenticatedSettings(
      { onboardingCompleted: true },
      "free@example.com"
    );
    expect(resolvedFree.tier).toBe("free");
  });

  it("resets demo 'pro' and onboarding state on resolveAuthSuccessState", () => {
    const authInit = resolveAuthSuccessState("signup@example.com");

    expect(authInit.settings.tier).toBe("free");
    expect(authInit.settings.onboardingCompleted).toBe(false);
    expect(authInit.settings.email).toBe("signup@example.com");
    expect(authInit.history).toEqual([]);
    expect(authInit.badges).toEqual([]);
    expect(authInit.entryMode).toBe("onboarding");
  });

  it("allows demo tier toggle only when unauthenticated (empty email)", () => {
    expect(canUseDemoTierToggle({ email: "" })).toBe(true);
    expect(canUseDemoTierToggle({ email: "   " })).toBe(true);
    expect(canUseDemoTierToggle({ email: "user@example.com" })).toBe(false);
  });
});

describe("P0-3: INITIAL_DEMO_SESSIONS is isolated from real registered users", () => {
  it("hydrates authenticated user with 0 cloud sessions to empty history [] (no demo sessions)", () => {
    const hydrated = resolveCloudHydrationState(
      {
        settingsPartial: undefined,
        sessions: [],
        badges: [],
      },
      "real@example.com",
      "Real User"
    );

    expect(hydrated.history).toEqual([]);
    expect(hydrated.badges).toEqual([]);
    expect(hydrated.settings.tier).toBe("free");
    expect(hydrated.entryMode).toBe("onboarding");
  });

  it("hydrates authenticated user with undefined cloud sessions to empty history []", () => {
    const hydrated = resolveCloudHydrationState(
      {
        settingsPartial: { onboardingCompleted: true, role: "coach" },
      },
      "coach@example.com"
    );

    expect(hydrated.history).toEqual([]);
    expect(hydrated.badges).toEqual([]);
    expect(hydrated.entryMode).toBe("app");
    expect(hydrated.initialTab).toBe("coach_athletes");
  });

  it("hydrates authenticated user with real cloud sessions and badges", () => {
    const realSession: WorkoutSession = {
      id: "real-sess-1",
      date: "2026-11-19T10:00:00.000Z",
      dayTitle: "Push",
      durationMinutes: 60,
      sets: [],
    };
    const realBadge: UnlockedBadge = {
      id: "first-session",
      rank: "Bronze",
      muscleGroup: "Biceps",
      exerciseName: "EZ Bar Curl",
      weightKg: 40,
      reps: 10,
      unlockedAt: "2026-11-19T11:00:00.000Z",
    };

    const hydrated = resolveCloudHydrationState(
      {
        settingsPartial: { onboardingCompleted: true, tier: "pro" },
        sessions: [realSession],
        badges: [realBadge],
      },
      "athlete@example.com"
    );

    expect(hydrated.history).toEqual([realSession]);
    expect(hydrated.badges).toEqual([realBadge]);
    expect(hydrated.settings.tier).toBe("pro");
    expect(hydrated.entryMode).toBe("app");
  });

  it("loads INITIAL_DEMO_SESSIONS only in explicit demo entry state", () => {
    const demo = resolveDemoEntryState(DEFAULT_SETTINGS);

    expect(demo.history).toEqual(INITIAL_DEMO_SESSIONS);
    expect(demo.history.length).toBeGreaterThan(0);
    expect(demo.settings.onboardingCompleted).toBe(true);
    expect(demo.settings.tier).toBe("pro");
    expect(demo.entryMode).toBe("app");
  });

  it("resets all user and demo state cleanly on sign-out", () => {
    const reset = createSignedOutResetState();

    expect(reset.settings.tier).toBe("free");
    expect(reset.settings.email).toBe("");
    expect(reset.history).toEqual([]);
    expect(reset.badges).toEqual([]);
    expect(reset.checkIns).toEqual([]);
    expect(reset.activeSets).toEqual([]);
    expect(reset.todayCheckIn).toBeNull();
    expect(reset.exercises).toEqual(PRESET_EXERCISES);
    expect(reset.customDays).toEqual(DEFAULT_CUSTOM_DAYS);
    expect(reset.tab).toBe("workout");
    expect(reset.entryMode).toBe("landing");
  });
});
