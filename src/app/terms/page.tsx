import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-zinc-950 px-5 py-10 text-zinc-200 space-y-6">
      <Link
        href="/"
        className="text-xs font-bold text-yellow-400 hover:underline"
      >
        ← Retour à Club Faouzi Tracker
      </Link>

      <h1 className="text-2xl font-black text-white">
        Conditions d&apos;Utilisation
      </h1>
      <p className="text-xs text-zinc-400">
        Dernière mise à jour : Novembre 2026
      </p>

      <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-base font-bold text-white">1. Service</h2>
        <p>
          Club Faouzi Tracker est une application de suivi d&apos;entraînement
          et de coaching sportif proposant un accès gratuit et un abonnement
          Pro mensuel géré via Stripe.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed text-zinc-300">
        <h2 className="text-base font-bold text-white">2. Responsabilité</h2>
        <p>
          Les programmes, calculs de charges et indicateurs sont fournis à titre
          informatif. Veillez à pratiquer avec une technique adaptée et à
          consulter un professionnel de santé en cas de doute.
        </p>
      </section>
    </main>
  );
}
