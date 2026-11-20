import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-zinc-950 px-5 py-10 text-zinc-200 space-y-6">
      <Link
        href="/"
        className="text-xs font-bold text-yellow-400 hover:underline"
      >
        ← Retour à Club Faouzi Tracker
      </Link>

      <h1 className="text-2xl font-black text-white">
        Politique de Confidentialité
      </h1>
      <p className="text-xs text-zinc-400">
        Dernière mise à jour : Novembre 2026
      </p>

      <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-base font-bold text-white">
          1. Données collectées
        </h2>
        <p>
          Club Faouzi Tracker collecte uniquement les informations nécessaires au
          suivi de vos entraînements : adresse email (via Google OAuth ou
          email), nom d&apos;affichage, séries, répétitions, charges, badges et
          check-ins de coaching.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-base font-bold text-white">
          2. Partage avec votre Coach
        </h2>
        <p>
          Si vous saisissez volontairement un Code Coach, vos séances et
          check-ins sont visibles par ce coach uniquement à des fins de suivi
          sportif. Aucune donnée n&apos;est vendue à des tiers.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-base font-bold text-white">
          3. Sécurité & Suppression
        </h2>
        <p>
          Vos données sont hébergées sur Supabase avec chiffrement et contrôle
          d&apos;accès par utilisateur (RLS). Vous pouvez demander la
          suppression de votre compte à tout moment.
        </p>
      </section>
    </main>
  );
}
