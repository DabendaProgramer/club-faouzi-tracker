# Club Faouzi Tracker

Application web SaaS mobile-first de suivi musculation (Next.js App Router, TypeScript, Tailwind CSS, Supabase & Stripe).

## Fonctionnalités
- **Tracker de séance** : séries d'échauffement, activation, Top Set (Max Reps) et calcul automatique du **Back-off (0.85x)** arrondi (`0.5 / 1 / 2.5 kg`).
- **Support complet** : `kg`, `lbs`, `Par côté (each side)`, `Barre vide`, `Minimum PR`, notes techniques et minuteur de repos avec bip sonore.
- **Cycle 11 Jours & Planning Personnalisé** : programme 11-Day Split pré-configuré ou création de planning sur mesure.
- **Dashboard & Rangs Club Faouzi** : comparaison vs dernière séance (`1RM estimé`, `% Volume`, `PR`) et déblocage automatique des badges (**Iron → Bronze → Silver → Gold → Diamond → Master**).
- **Mobilité & Étirements** : routines avant/après séance avec chronomètres intégrés (`50s` / `10s`).
- **Modèle SaaS Freemium** : prêt pour l'authentification Supabase ([`supabase/schema.sql`](supabase/schema.sql)) et les abonnements Stripe ([`src/app/api/checkout/route.ts`](src/app/api/checkout/route.ts)).

## Démarrer en local

```bash
npm.cmd install
npm.cmd run dev
```

Copier `.env.example` vers `.env.local` pour connecter Supabase et Stripe :
```bash
cp .env.example .env.local
```

## Lier et pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit: Club Faouzi Tracker"
git branch -M main
git remote add origin https://github.com/<TON_PSEUDO>/club-faouzi-tracker.git
git push -u origin main
```

## Déploiement Cloud (Gratuit / Peu cher)
1. **GitHub** : pousse le code sur ton dépôt.
2. **Supabase** : crée un projet et exécute `supabase/schema.sql` dans le SQL Editor.
3. **Vercel** : importe le dépôt GitHub, ajoute les variables d'environnement de `.env.example` et déploie.
