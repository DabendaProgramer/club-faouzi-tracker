"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Award,
  Calculator,
  Check,
  Crown,
  LogIn,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LandingAndAuthProps {
  onEnterDemo: () => void;
  onAuthSuccess: (email: string) => void;
}

export function LandingAndAuth({
  onEnterDemo,
  onAuthSuccess,
}: LandingAndAuthProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Entre ton email et ton mot de passe.");
      return;
    }

    if (!supabase) {
      // Graceful fallback when Supabase keys are not set locally
      onAuthSuccess(email.trim());
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      onAuthSuccess(email.trim());
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erreur d'authentification."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-between bg-zinc-950 px-5 py-8 text-zinc-50">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 text-zinc-950 shadow-lg shadow-yellow-500/20">
            <Crown className="h-5 w-5" />
          </div>
          <span className="text-base font-black tracking-tight text-white">
            CLUB <span className="text-yellow-400">FAOUZI</span>
          </span>
        </div>

        <button
          onClick={() => {
            setIsSignUp(false);
            setShowAuth(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-bold text-zinc-200 hover:border-yellow-500/50"
        >
          <LogIn className="h-3.5 w-3.5" />
          Connexion
        </button>
      </header>

      {/* Main Hero or Auth Card */}
      {!showAuth ? (
        <main className="my-8 space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-400">
              <Sparkles className="h-3 w-3" />
              Performance & Coaching SaaS
            </span>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-white">
              Chaque série comptée.{" "}
              <span className="text-yellow-400">Chaque PR validé.</span>
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              L&apos;application mobile conçue pour le suivi sérieux : calcul
              automatique des Back-off 0.85x, Cycle 11 Jours, Rangs Club Faouzi
              et Check-in Coach intégré.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setShowAuth(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3.5 text-sm font-black text-zinc-950 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-400 active:scale-[0.99]"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onEnterDemo}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-3 text-xs font-bold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >
                Tester la Démo sans compte
              </button>
            </div>
          </div>

          {/* 3 Clean Value Props */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-start gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
              <Calculator className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <h3 className="text-xs font-bold text-white">
                  Top Set & Back-off 0.85x automatique
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Sépare échauffement et travail, calcule ta charge à 85% et
                  compare directement à ta dernière séance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <h3 className="text-xs font-bold text-white">
                  Rangs Club Faouzi (Iron → Master)
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Débloque tes badges en direct dès que tu valides un palier du
                  Performance Chart.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <h3 className="text-xs font-bold text-white">
                  Check-in 20 sec & Tableau de bord Coach
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Sommeil, caféine, stress et intensité synchronisés directement
                  avec ton coach, sans Google Form.
                </p>
              </div>
            </div>
          </div>

          {/* Compact Pricing Preview */}
          <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                  Club Faouzi Pro
                </span>
                <div className="text-lg font-black text-white">
                  9 € <span className="text-xs font-medium text-zinc-400">/ mois</span>
                </div>
              </div>
              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                Plan Gratuit inclus
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-zinc-300">
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Cycle 11 Jours
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Back-off 0.85x
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Rangs & Badges
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-yellow-400" /> Check-in & Coach
              </span>
            </div>
          </div>
        </main>
      ) : (
        <main className="my-10 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-black text-white">
              {isSignUp ? "Créer ton compte" : "Bon retour"}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              {isSignUp
                ? "Synchronise tes séances, tes rangs et tes check-ins dans le cloud."
                : "Connecte-toi pour retrouver ton programme et tes performances."}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-400">
                Mot de passe
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-yellow-500"
              />
            </div>

            {errorMsg && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-black text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-50"
            >
              {loading
                ? "Chargement..."
                : isSignUp
                ? "Créer mon compte"
                : "Se connecter"}
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="hover:text-white"
            >
              {isSignUp ? "Déjà un compte ? Connexion" : "Pas de compte ? Inscription"}
            </button>
            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              ← Retour
            </button>
          </div>
        </main>
      )}

      <footer className="text-center text-[11px] text-zinc-600">
        Club Faouzi Tracker · Mobile-First Performance SaaS
      </footer>
    </div>
  );
}
