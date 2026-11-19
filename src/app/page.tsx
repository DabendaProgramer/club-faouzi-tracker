"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  ClipboardCheck,
  Crown,
  Dumbbell,
  User,
  Users,
} from "lucide-react";
import {
  CoachingCheckIn,
  Exercise,
  LoggedSet,
  SplitDay,
  UnlockedBadge,
  UserSettings,
  WorkoutSession,
} from "@/types/workout";
import {
  INITIAL_DEMO_SESSIONS,
  PRESET_EXERCISES,
  SPLIT_11_DAYS,
} from "@/data/presets";
import { isWorkingSet, toKg } from "@/lib/workout-engine";
import {
  fetchCloudData,
  getCurrentUserId,
  saveBadgeToCloud,
  saveCheckInToCloud,
  saveSessionToCloud,
  syncProfileSettingsToCloud,
} from "@/lib/supabase-sync";
import { WorkoutTracker } from "@/components/WorkoutTracker";
import { DashboardView } from "@/components/DashboardView";
import { SplitPlanner } from "@/components/SplitPlanner";
import { MobilityView } from "@/components/MobilityView";
import { SubscriptionProfileView } from "@/components/SubscriptionProfileView";
import { CoachDashboard } from "@/components/CoachDashboard";
import { BadgeUnlockModal } from "@/components/RankBadge";
import { LandingAndAuth } from "@/components/LandingAndAuth";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import {
  PostWorkoutWrapUpModal,
  PreWorkoutCheckInModal,
  computeReadinessScore,
} from "@/components/CheckInModals";

type TabKey =
  | "workout"
  | "dashboard"
  | "planner"
  | "mobility"
  | "coach_athletes"
  | "coach_sessions"
  | "profile";

type EntryMode = "landing" | "onboarding" | "app";

const DEFAULT_SETTINGS: UserSettings = {
  displayName: "Athlète Faouzi",
  email: "",
  role: "athlete",
  onboardingCompleted: false,
  tier: "pro",
  splitMode: "11-day",
  currentCycleDay: 1,
  roundingStep: 0.5,
  preferredUnit: "kg",
  defaultRestSeconds: 120,
};

const DEFAULT_CUSTOM_DAYS: SplitDay[] = [
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

const STORAGE_KEY = "club_faouzi_tracker_state_v1";

function formatHourMin(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const [entryMode, setEntryMode] = useState<EntryMode>("landing");
  const [tab, setTab] = useState<TabKey>("workout");
  const [hydrated, setHydrated] = useState(false);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [exercises, setExercises] = useState<Exercise[]>(PRESET_EXERCISES);
  const [customDays, setCustomDays] =
    useState<SplitDay[]>(DEFAULT_CUSTOM_DAYS);
  const [history, setHistory] = useState<WorkoutSession[]>(
    INITIAL_DEMO_SESSIONS
  );
  const [activeSets, setActiveSets] = useState<LoggedSet[]>([]);
  const [badges, setBadges] = useState<UnlockedBadge[]>([]);
  const [checkIns, setCheckIns] = useState<CoachingCheckIn[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<CoachingCheckIn | null>(
    null
  );

  const [showPreCheckIn, setShowPreCheckIn] = useState(false);
  const [showPostWrapUp, setShowPostWrapUp] = useState(false);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] =
    useState<UnlockedBadge | null>(null);

  // Hydrate from localStorage, then sync from Supabase if logged in
  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.settings) {
            const mergedSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
            setSettings(mergedSettings);
            if (mergedSettings.onboardingCompleted) {
              setEntryMode("app");
            }
          }
          if (parsed.exercises) {
            const customOnes = (parsed.exercises as Exercise[]).filter(
              (ex) => !PRESET_EXERCISES.some((p) => p.id === ex.id)
            );
            setExercises([...customOnes, ...PRESET_EXERCISES]);
          }
          if (parsed.customDays) setCustomDays(parsed.customDays);
          if (parsed.history) setHistory(parsed.history);
          if (parsed.activeSets) setActiveSets(parsed.activeSets);
          if (parsed.badges) setBadges(parsed.badges);
          if (parsed.checkIns) setCheckIns(parsed.checkIns);
          if (parsed.todayCheckIn) setTodayCheckIn(parsed.todayCheckIn);
        }

        const userId = await getCurrentUserId();
        if (userId) {
          const cloud = await fetchCloudData(userId);
          if (cloud.settingsPartial) {
            setSettings((prev) => ({ ...prev, ...cloud.settingsPartial }));
            setEntryMode(
              cloud.settingsPartial.onboardingCompleted ? "app" : "onboarding"
            );
          }
          if (cloud.sessions && cloud.sessions.length > 0) {
            setHistory(cloud.sessions);
          }
          if (cloud.badges && cloud.badges.length > 0) {
            setBadges(cloud.badges);
          }
        }
      } catch {
        // ignore storage or network errors
      } finally {
        setHydrated(true);
      }
    });
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings,
          exercises,
          customDays,
          history,
          activeSets,
          badges,
          checkIns,
          todayCheckIn,
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [
    hydrated,
    settings,
    exercises,
    customDays,
    history,
    activeSets,
    badges,
    checkIns,
    todayCheckIn,
  ]);

  const activeSplitList =
    settings.splitMode === "11-day" ? SPLIT_11_DAYS : customDays;

  const currentDay = useMemo(
    () =>
      activeSplitList.find((d) => d.dayIndex === settings.currentCycleDay) ??
      activeSplitList[0],
    [activeSplitList, settings.currentCycleDay]
  );

  const handleAddSet = (newSet: LoggedSet) => {
    setActiveSets((prev) => [...prev, newSet]);

    if (newSet.unlockedRank && settings.tier === "pro") {
      const weightKg = toKg(
        newSet.weight * (newSet.isEachSide ? 2 : 1),
        newSet.unit
      );
      const alreadyHasRank = badges.some(
        (b) =>
          b.exerciseName === newSet.exerciseName &&
          b.rank === newSet.unlockedRank
      );
      if (!alreadyHasRank) {
        const badge: UnlockedBadge = {
          id: `badge-${Date.now()}`,
          rank: newSet.unlockedRank,
          muscleGroup: newSet.muscleGroup,
          exerciseName: newSet.exerciseName,
          weightKg,
          reps: newSet.reps,
          unlockedAt: new Date().toISOString(),
        };
        setBadges((prev) => [badge, ...prev]);
        setNewlyUnlockedBadge(badge);
        void getCurrentUserId().then((uid) => {
          if (uid) void saveBadgeToCloud(uid, badge);
        });
      }
    }
  };

  const handleRemoveSet = (setId: string) => {
    setActiveSets((prev) => prev.filter((s) => s.id !== setId));
  };

  const handleAdvanceDay = () => {
    const nextIdx =
      activeSplitList.findIndex((d) => d.dayIndex === currentDay.dayIndex) + 1;
    const nextDay =
      activeSplitList[nextIdx >= activeSplitList.length ? 0 : nextIdx];
    if (nextDay) {
      handleUpdateSettings({ currentCycleDay: nextDay.dayIndex });
    }
  };

  const sessionStartTime = formatHourMin(activeSets[0]?.completedAt);
  const firstWorkingSet = activeSets.find(isWorkingSet);
  const firstWorkingSetTime = firstWorkingSet
    ? formatHourMin(firstWorkingSet.completedAt)
    : undefined;

  const handleConfirmFinish = (intensity: number, negativeFactors: string) => {
    if (activeSets.length === 0) return;

    const newSession: WorkoutSession = {
      id: `sess-${crypto.randomUUID()}`,
      date: new Date().toISOString(),
      dayTitle: currentDay.title,
      splitDayIndex: currentDay.dayIndex,
      sets: activeSets,
    };

    const finalizedCheckIn: CoachingCheckIn = todayCheckIn
      ? {
          ...todayCheckIn,
          sessionTime: sessionStartTime,
          firstWorkingSetTime,
          intensity,
          negativeFactors: negativeFactors || undefined,
        }
      : {
          id: `chk-${crypto.randomUUID()}`,
          date: new Date().toISOString(),
          fullName: settings.displayName,
          muscleGroup: currentDay.title,
          sleepStart: "23:30",
          sleepEnd: "07:30",
          sleepQuality: 7,
          sleepDisruptors: [],
          preWorkoutMeal: "breakfast_and_pre",
          hydrated: true,
          caffeinePre: false,
          caffeineEarlier: false,
          caffeineDayBefore: false,
          stress: 4,
          energy: 7,
          motivation: 8,
          sessionTime: sessionStartTime,
          firstWorkingSetTime,
          intensity,
          negativeFactors: negativeFactors || undefined,
          readinessScore: computeReadinessScore({
            sleepQuality: 7,
            hydrated: true,
            preWorkoutMeal: "breakfast_and_pre",
            stress: 4,
            energy: 7,
            motivation: 8,
          }),
        };

    setHistory((prev) => [newSession, ...prev]);
    setCheckIns((prev) => [finalizedCheckIn, ...prev]);
    setTodayCheckIn(null);
    setActiveSets([]);
    setShowPostWrapUp(false);

    void getCurrentUserId().then((uid) => {
      if (uid) {
        void saveSessionToCloud(uid, newSession);
        void saveCheckInToCloud(uid, finalizedCheckIn);
      }
    });

    handleAdvanceDay();
    setTab("dashboard");
  };

  const handleUpdateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      void getCurrentUserId().then((uid) => {
        if (uid) void syncProfileSettingsToCloud(uid, updated);
      });
      return updated;
    });
    if (partial.role === "coach") {
      setTab("coach_athletes");
    } else if (partial.role === "athlete") {
      setTab("workout");
    }
  };

  const handleAddCustomExercise = (ex: Exercise) => {
    setExercises((prev) => [ex, ...prev]);
  };

  // 1. Landing & Auth Gate
  if (entryMode === "landing") {
    return (
      <LandingAndAuth
        onEnterDemo={() => {
          handleUpdateSettings({ onboardingCompleted: true });
          setEntryMode("app");
        }}
        onAuthSuccess={(email) => {
          handleUpdateSettings({ email });
          setEntryMode(settings.onboardingCompleted ? "app" : "onboarding");
        }}
      />
    );
  }

  // 2. First-time 3-step Onboarding
  if (entryMode === "onboarding") {
    return (
      <OnboardingFlow
        initialSettings={settings}
        onComplete={(updates) => {
          handleUpdateSettings(updates);
          setEntryMode("app");
        }}
      />
    );
  }

  // 3. Main App — Completely separate Coach vs Athlete navigation
  const navItems: {
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] =
    settings.role === "coach"
      ? [
          { key: "coach_athletes", label: "Athlètes", icon: Users },
          { key: "coach_sessions", label: "Séances", icon: Dumbbell },
          { key: "profile", label: "Profil", icon: User },
        ]
      : [
          { key: "workout", label: "Séance", icon: Dumbbell },
          { key: "dashboard", label: "Dashboard", icon: BarChart3 },
          { key: "planner", label: "Planning", icon: Calendar },
          { key: "mobility", label: "Mobilité", icon: Activity },
          { key: "profile", label: "Profil", icon: User },
        ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-zinc-950">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 text-zinc-950 shadow-md shadow-yellow-500/20">
            <Crown className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">
              CLUB <span className="text-yellow-400">FAOUZI</span>
            </h1>
            <p className="text-[10px] font-medium text-zinc-400">
              {settings.displayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {settings.role === "athlete" ? (
            <button
              onClick={() => setShowPreCheckIn(true)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                todayCheckIn
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-yellow-500/50"
              }`}
            >
              <ClipboardCheck className="h-3 w-3" />
              {todayCheckIn ? "Check-in ✓" : "Check-in"}
            </button>
          ) : (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
              Espace Coach
            </span>
          )}

          <button
            onClick={() => setTab("profile")}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
              settings.tier === "pro"
                ? "border border-yellow-500/40 bg-yellow-500/15 text-yellow-400"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            <Crown className="h-3 w-3" />
            {settings.tier === "pro" ? "PRO" : "Pro"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4">
        {tab === "workout" && (
          <WorkoutTracker
            exercises={exercises}
            currentDay={currentDay}
            history={history}
            settings={settings}
            activeSets={activeSets}
            onAddSet={handleAddSet}
            onRemoveSet={handleRemoveSet}
            onFinishSession={() => setShowPostWrapUp(true)}
            onAddCustomExercise={handleAddCustomExercise}
            onUnlockProClick={() => setTab("profile")}
            onGoToMobility={() => setTab("mobility")}
            onAdvanceDay={handleAdvanceDay}
          />
        )}

        {tab === "dashboard" && (
          <DashboardView
            exercises={exercises}
            history={history}
            activeSets={activeSets}
            badges={badges}
            settings={settings}
            onUnlockProClick={() => setTab("profile")}
          />
        )}

        {tab === "planner" && (
          <SplitPlanner
            settings={settings}
            splitDays={SPLIT_11_DAYS}
            customSplitDays={customDays}
            exercises={exercises}
            onSwitchMode={(mode) =>
              handleUpdateSettings({ splitMode: mode, currentCycleDay: 1 })
            }
            onSelectCycleDay={(dayIndex) =>
              handleUpdateSettings({ currentCycleDay: dayIndex })
            }
            onUpdateCustomDays={setCustomDays}
            onUnlockProClick={() => setTab("profile")}
            onGoToWorkout={() => setTab("workout")}
          />
        )}

        {tab === "mobility" && (
          <MobilityView
            settings={settings}
            onUnlockProClick={() => setTab("profile")}
          />
        )}

        {settings.role === "coach" &&
          (tab === "coach_athletes" || tab === "coach_sessions") && (
            <CoachDashboard
              view={tab === "coach_athletes" ? "athletes" : "sessions"}
              settings={settings}
              userCheckIns={checkIns}
              userHistory={history}
            />
          )}

        {tab === "profile" && (
          <SubscriptionProfileView
            settings={settings}
            history={history}
            onUpdateSettings={handleUpdateSettings}
            onShowLanding={() => setEntryMode("landing")}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 backdrop-blur-md">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-bold transition ${
                  active
                    ? "bg-yellow-500/15 text-yellow-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="mb-0.5 h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <PreWorkoutCheckInModal
        open={showPreCheckIn}
        fullName={settings.displayName}
        muscleGroup={currentDay.title}
        existingCheckIn={todayCheckIn}
        onClose={() => setShowPreCheckIn(false)}
        onSave={(chk) => setTodayCheckIn(chk)}
      />

      <PostWorkoutWrapUpModal
        open={showPostWrapUp}
        sessionTime={sessionStartTime}
        firstWorkingSetTime={firstWorkingSetTime}
        onClose={() => setShowPostWrapUp(false)}
        onConfirmFinish={handleConfirmFinish}
      />

      <BadgeUnlockModal
        badge={newlyUnlockedBadge}
        onClose={() => setNewlyUnlockedBadge(null)}
      />
    </div>
  );
}
