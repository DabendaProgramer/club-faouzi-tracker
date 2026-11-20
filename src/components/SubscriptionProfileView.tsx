"use client";

import React, { useState } from "react";
import {
  Check,
  Cloud,
  Crown,
  Download,
  LogIn,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import {
  RoundingStep,
  UserSettings,
  WeightUnit,
  WorkoutSession,
} from "@/types/workout";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface SubscriptionProfileViewProps {
  settings: UserSettings;
  history: WorkoutSession[];
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onShowLanding?: () => void;
  onSignOut?: () => void;
}

export function SubscriptionProfileView({
  settings,
  history,
  onUpdateSettings,
  onShowLanding,
  onSignOut,
}: SubscriptionProfileViewProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState(settings.email || "");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const handleSubscribePro = async () => {
    setCheckoutLoading(true);
    setCheckoutMessage(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "pro_monthly",
          email: settings.email || authEmail || undefined,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.demoMode) {
        onUpdateSettings({ tier: "pro" });
        setCheckoutMessage(
          "Mode Démo : abonnement Club Faouzi Pro activé localement ! (Configure Stripe dans .env.local pour le paiement réel)."
        );
      } else if (data.error) {
        setCheckoutMessage(data.error);
      }
    } catch {
      setCheckoutMessage("Impossible de contacter le serveur de paiement.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setAuthMessage(
        "Supabase non configuré : ajoute NEXT_PUBLIC_SUPABASE_URL et ANON_KEY dans .env.local."
      );
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) {
      // Try sign up automatically if user doesn't exist yet
      const { error: signUpErr } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (signUpErr) {
        setAuthMessage(signUpErr.message);
      } else {
        onUpdateSettings({ email: authEmail });
        setAuthMessage("Compte créé ! Vérifie ta boîte mail si confirmation activée.");
      }
    } else {
      onUpdateSettings({ email: authEmail });
      setAuthMessage("Connecté au cloud Supabase !");
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ settings, history }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `club-faouzi-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Profile Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">
                {settings.displayName}
              </h2>
              <p className="text-xs text-zinc-400">
                {settings.email || "Session locale (Démo)"}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${
              settings.tier === "pro"
                ? "bg-yellow-500 text-zinc-950"
                : "border border-zinc-700 bg-zinc-950 text-zinc-300"
            }`}
          >
            {settings.tier === "pro" ? "PRO ACTIF" : "GRATUIT"}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3 text-xs">
          {!settings.email ? (
            <div className="inline-flex rounded-lg bg-zinc-950 p-0.5">
              {(["athlete", "coach"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onUpdateSettings({ role: r })}
                  className={`rounded-md px-3 py-1 text-[11px] font-bold capitalize ${
                    settings.role === r
                      ? "bg-yellow-500 text-zinc-950"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {r === "athlete" ? "Démo Athlète" : "Démo Coach"}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Compte {settings.role === "coach" ? "Coach" : "Athlète"}
            </span>
          )}

          {settings.email && onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
            >
              Déconnexion
            </button>
          ) : (
            onShowLanding && (
              <button
                type="button"
                onClick={onShowLanding}
                className="text-[11px] font-semibold text-zinc-400 hover:text-white"
              >
                Page d&apos;accueil →
              </button>
            )
          )}
        </div>

        {/* Code Coach Linking */}
        <div className="mt-3 border-t border-zinc-800 pt-3 text-xs">
          {settings.role === "coach" ? (
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Ton Code Coach à partager :</span>
              <span className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 font-mono font-black text-yellow-400">
                {settings.coachCode || "FAOUZI-PRO"}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">Code Coach :</span>
              <input
                type="text"
                placeholder="Ex: FAOUZI-PRO"
                value={settings.coachCode ?? ""}
                onChange={(e) =>
                  onUpdateSettings({
                    coachCode: e.target.value.toUpperCase(),
                  })
                }
                className="w-36 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-right font-mono text-xs font-bold uppercase text-white outline-none focus:border-yellow-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* SaaS Subscription Plans (Freemium vs Pro) */}
      <div className="rounded-2xl border border-yellow-500/40 bg-gradient-to-b from-yellow-500/10 to-zinc-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-yellow-400">
              <Crown className="h-3.5 w-3.5" />
              Abonnement SaaS
            </div>
            <h3 className="text-lg font-black text-white">
              Club Faouzi Pro — 9€ / mois
            </h3>
          </div>
          <button
            onClick={() =>
              onUpdateSettings({
                tier: settings.tier === "pro" ? "free" : "pro",
              })
            }
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:border-yellow-500/50"
          >
            Tester {settings.tier === "pro" ? "Gratuit" : "Pro"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-1.5">
            <div className="font-bold text-zinc-300">Plan Gratuit</div>
            <ul className="space-y-1 text-zinc-400">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Tracking
                séries, reps & poids
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Planning
                personnalisé
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Comparaison
                vs dernière séance
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-yellow-500/40 bg-zinc-950 p-3 space-y-1.5">
            <div className="inline-flex items-center gap-1 font-bold text-yellow-400">
              <Sparkles className="h-3.5 w-3.5" /> Plan Pro
            </div>
            <ul className="space-y-1 text-zinc-200">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Cycle 11 Jours
                pré-configuré
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Calcul auto
                Back-off 0.85x
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Rangs & Badges
                Club Faouzi
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Mobilité &
                Timers guidés
              </li>
            </ul>
          </div>
        </div>

        {settings.tier !== "pro" && (
          <button
            onClick={handleSubscribePro}
            disabled={checkoutLoading}
            className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-black uppercase tracking-wide text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-50"
          >
            {checkoutLoading
              ? "Redirection Stripe..."
              : "Passer à Club Faouzi Pro (9€/mois)"}
          </button>
        )}

        {checkoutMessage && (
          <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-2.5 text-xs text-yellow-200">
            {checkoutMessage}
          </p>
        )}
      </div>

      {/* Training Preferences (Athlete only) */}
      {settings.role === "athlete" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
        <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-white">
          <Settings className="h-4 w-4 text-yellow-400" />
          Préférences d&apos;entraînement
        </h3>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400">
            Arrondi automatique du Back-off (0.85x)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([0.5, 1, 2.5] as RoundingStep[]).map((step) => (
              <button
                key={step}
                onClick={() => onUpdateSettings({ roundingStep: step })}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  settings.roundingStep === step
                    ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400"
                }`}
              >
                {step} kg
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Unité par défaut
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["kg", "lbs"] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => onUpdateSettings({ preferredUnit: u })}
                  className={`rounded-xl border py-2 text-xs font-bold uppercase ${
                    settings.preferredUnit === u
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              Repos auto (sec)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[90, 120, 180].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onUpdateSettings({ defaultRestSeconds: sec })}
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    settings.defaultRestSeconds === sec
                      ? "border-yellow-500 bg-yellow-500/15 text-yellow-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Cloud Sync (Supabase Auth) & Backup */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-white">
            <Cloud className="h-4 w-4 text-sky-400" />
            Sync Cloud Supabase
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isSupabaseConfigured
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {isSupabaseConfigured ? "Connecté" : "Mode Local"}
          </span>
        </div>

        <form onSubmit={handleSupabaseSignIn} className="space-y-2">
          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-yellow-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-yellow-500"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 py-2.5 text-xs font-bold text-white hover:border-yellow-500/50"
          >
            <LogIn className="h-3.5 w-3.5" />
            Connexion / Créer un compte
          </button>
        </form>

        {authMessage && (
          <p className="text-[11px] text-zinc-300">{authMessage}</p>
        )}

        <button
          onClick={handleExportJson}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 text-xs font-bold text-zinc-300 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" />
          Exporter mes données (JSON)
        </button>
      </div>
    </div>
  );
}
