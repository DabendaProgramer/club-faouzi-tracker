"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  Crown,
  Dumbbell,
  User,
} from "lucide-react";
import {
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
import { toKg } from "@/lib/workout-engine";
import { WorkoutTracker } from "@/components/WorkoutTracker";
import { DashboardView } from "@/components/DashboardView";
import { SplitPlanner } from "@/components/SplitPlanner";
import { MobilityView } from "@/components/MobilityView";
import { SubscriptionProfileView } from "@/components/SubscriptionProfileView";
import { BadgeUnlockModal } from "@/components/RankBadge";

type TabKey = "workout" | "dashboard" | "planner" | "mobility" | "profile";

const DEFAULT_SETTINGS: UserSettings = {
  displayName: "Athlète Faouzi",
  email: "",
  tier: "pro", // Pro activé en démo pour tester toutes les fonctionnalités immédiatement
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

export default function HomePage() {
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
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] =
    useState<UnlockedBadge | null>(null);

  // Load state from localStorage
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.settings)
            setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
          if (parsed.exercises) setExercises(parsed.exercises);
          if (parsed.customDays) setCustomDays(parsed.customDays);
          if (parsed.history) setHistory(parsed.history);
          if (parsed.activeSets) setActiveSets(parsed.activeSets);
          if (parsed.badges) setBadges(parsed.badges);
        }
      } catch {
        // ignore corrupted local storage
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
        })
      );
    } catch {
      // ignore quota errors
    }
  }, [hydrated, settings, exercises, customDays, history, activeSets, badges]);

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
      }
    }
  };

  const handleRemoveSet = (setId: string) => {
    setActiveSets((prev) => prev.filter((s) => s.id !== setId));
  };

  const handleFinishSession = () => {
    if (activeSets.length === 0) return;
    const newSession: WorkoutSession = {
      id: `sess-${Date.now()}`,
      date: new Date().toISOString(),
      dayTitle: currentDay.title,
      splitDayIndex: currentDay.dayIndex,
      sets: activeSets,
    };
    setHistory((prev) => [newSession, ...prev]);
    setActiveSets([]);

    // Advance cycle day automatically
    const nextIdx =
      activeSplitList.findIndex((d) => d.dayIndex === currentDay.dayIndex) + 1;
    const nextDay =
      activeSplitList[nextIdx >= activeSplitList.length ? 0 : nextIdx];
    if (nextDay) {
      setSettings((prev) => ({ ...prev, currentCycleDay: nextDay.dayIndex }));
    }

    setTab("dashboard");
  };

  const handleUpdateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleAddCustomExercise = (ex: Exercise) => {
    setExercises((prev) => [ex, ...prev]);
  };

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
              Performance & Split Tracker
            </p>
          </div>
        </div>

        <button
          onClick={() => setTab("profile")}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition ${
            settings.tier === "pro"
              ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/40"
              : "bg-zinc-800 text-zinc-300"
          }`}
        >
          <Crown className="h-3 w-3" />
          {settings.tier === "pro" ? "PRO" : "Passer Pro"}
        </button>
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
            onFinishSession={handleFinishSession}
            onAddCustomExercise={handleAddCustomExercise}
            onUnlockProClick={() => setTab("profile")}
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

        {tab === "profile" && (
          <SubscriptionProfileView
            settings={settings}
            history={history}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 backdrop-blur-md">
        <div className="grid grid-cols-5 gap-1">
          {[
            { key: "workout", label: "Séance", icon: Dumbbell },
            { key: "dashboard", label: "Dashboard", icon: BarChart3 },
            { key: "planner", label: "Planning", icon: Calendar },
            { key: "mobility", label: "Mobilité", icon: Activity },
            { key: "profile", label: "Profil", icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key as TabKey)}
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

      {/* Rank Badge Unlock Modal */}
      <BadgeUnlockModal
        badge={newlyUnlockedBadge}
        onClose={() => setNewlyUnlockedBadge(null)}
      />
    </div>
  );
}
