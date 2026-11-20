# Product Management Scoping & Prioritization — Club Faouzi Tracker

**Document Version:** 1.0  
**Target Release:** Production Readiness (M1 -> M2 -> M3)  
**Stack:** Next.js 16.4.6 (App Router), React 19.3.0, TypeScript 5 (`strict: true`), Tailwind CSS 4, Supabase (Auth / PostgreSQL / RLS), Stripe (Checkout & Webhooks)

---

## 1. Context & Objective

Club Faouzi Tracker is a fitness tracking and coaching SaaS application supporting two roles (`athlete` and `coach`), freemium vs. Pro subscriptions (`9€ / mois`), workout logging with 11-day / custom splits, coaching check-ins, and Supabase cloud synchronization.

Before production launch, an audit identified **three critical P0 defects** (monetization bypass, unverified payment webhook, and demo data leakage into real user accounts) and **three P1 functional/UX gaps** (silent coach code linking, local-only custom exercises/planning, and coach check-in history visibility).

This document establishes the prioritization rationale, scopes **Milestone 1 (M1)** vs. **Milestone 2 (M2)**, and defines explicit effort, risk, dependency, and acceptance criteria for every item.

---

## 2. Current State Audit

| Area | Current State (Verified) | Impact | Classification |
|------|--------------------------|--------|----------------|
| **Signup Default Tier** | `DEFAULT_SETTINGS.tier` is hardcoded to `"pro"` in `src/app/page.tsx:69`. `handleSignedInUser` and `onAuthStateChange` preserve `prev.tier` when no `profiles` row exists. `SubscriptionProfileView.tsx` exposes `"Tester Gratuit / Pro"` and `data.demoMode` promotion to all users. | Every new user receives paid Pro features for free; authenticated users can self-promote client-side. | **P0-1** |
| **Stripe Webhook Security** | `src/app/api/webhooks/stripe/route.ts:16` parses `await req.json()` directly without checking `STRIPE_WEBHOOK_SECRET` or verifying `stripe-signature`. `customer_details?.email` fallback is missing, and Supabase `.update()` errors are ignored. | Any unauthenticated caller can forge `checkout.session.completed` and grant `"pro"` access; DB failures silently return HTTP `200`. | **P0-2** |
| **Demo Data Isolation** | `src/app/page.tsx:113-115` initializes `history` to `INITIAL_DEMO_SESSIONS`. `handleSignedInUser` skips `setHistory`/`setBadges` when cloud arrays are empty; `onAuthStateChange` omits them; `handleSignOut` does not reset `history`/`badges`/`checkIns`/`exercises`/`customDays`. | Real registered users with 0 cloud sessions see fake demo sessions in their workout history and analytics. | **P0-3** |
| **Code Coach Visual Feedback** | `src/lib/supabase-sync.ts:27-35` looks up `coach_code` silently inside `syncProfileSettingsToCloud` without returning link success/error status to `SubscriptionProfileView.tsx`. | Athletes entering a coach code get no confirmation whether the code is valid, invalid, or linked. | **P1-1** |
| **Custom Exercises & Planning Sync** | `supabase/schema.sql` defines `profiles`, `workout_sessions`, `workout_sets`, `unlocked_badges`, and `coaching_checkins`, but has no tables/columns/RLS policies for custom exercises or custom split days. | Custom exercises and custom split schedules exist only in `localStorage` and are lost across devices/sessions. | **P1-2** |
| **Coach Check-ins History** | `src/lib/supabase-sync.ts:238-273` (`fetchCoachClients`) queries `coaching_checkins`, but UI rendering of full per-athlete check-in history in `CoachDashboard.tsx` needs verification/completion. | Coaches cannot review longitudinal readiness, energy, soreness, and post-workout notes per athlete. | **P1-3** |

---

## 3. Prioritization Framework

Items are evaluated against four production-readiness criteria:
1. **Security & Billing Integrity**: Does the gap allow unauthorized privilege escalation or forged payment events?
2. **Data Integrity & Tenant Isolation**: Does the gap corrupt or pollute real user records with mock/demo data?
3. **User-Facing Value & Coaching Workflow**: Does the gap degrade core coaching or multi-device UX?
4. **Blast Radius & Schema Dependency**: Does the fix require PostgreSQL schema/RLS migrations (`supabase/schema.sql`)?

### Scope Decision: M1 (P0 Mandatory Blockers) vs. M2 (All 3 P1 Items Retained)
- **Milestone 1 (M1 — Production Blockers)**: Deliver **P0-1**, **P0-2**, and **P0-3**, plus automated test infrastructure (`vitest`) and this scoping document. None of the P0s can be deferred because they directly compromise revenue, webhook security, and user data cleanliness.
- **Milestone 2 (M2 — Functional Completeness)**: Retain **all three P1 items (P1-1, P1-2, P1-3)** in M2 rather than cutting them. Deferring them out of M1 avoids mixing database schema/RLS changes (`P1-2`) and UI workflow enhancements (`P1-1`, `P1-3`) into the critical security/data-isolation patchset, while guaranteeing they ship before the M3 production release gate.

---

## 4. Prioritized Backlog Matrix

| ID | Title | Priority | Milestone | Effort | Risk | Dependencies | Target Files |
|----|-------|----------|-----------|--------|------|--------------|--------------|
| **P0-1** | Default Tier `'free'` & Client Guard | P0 | M1 | S | Low | Test runner (`vitest`) | `src/lib/auth-state.ts`, `src/app/page.tsx`, `src/components/SubscriptionProfileView.tsx` |
| **P0-2** | Stripe Webhook `stripe-signature` Verification | P0 | M1 | M | Med | `node:crypto`, `STRIPE_WEBHOOK_SECRET` | `src/lib/stripe-webhook.ts`, `src/app/api/webhooks/stripe/route.ts` |
| **P0-3** | Isolate `INITIAL_DEMO_SESSIONS` from Real Users | P0 | M1 | S | Low | `src/lib/auth-state.ts` | `src/lib/auth-state.ts`, `src/app/page.tsx` |
| **P1-1** | Code Coach Explicit Linking & Visual Feedback | P1 | M2 | S | Low | M1 (`auth-state.ts`) | `src/lib/supabase-sync.ts`, `src/components/SubscriptionProfileView.tsx` |
| **P1-2** | Supabase Sync for Custom Exercises & Planning | P1 | M2 | M | Med | `supabase/schema.sql` RLS | `supabase/schema.sql`, `src/lib/supabase-sync.ts`, `src/app/page.tsx` |
| **P1-3** | Coach Check-ins History View | P1 | M2 | S | Low | `fetchCoachClients` | `src/lib/supabase-sync.ts`, `src/components/CoachDashboard.tsx` |

### Detailed Acceptance Criteria

#### P0-1: New Signups Start in `'free'` Tier (M1)
- `DEFAULT_SETTINGS.tier` is `"free"` and `DEFAULT_SETTINGS.onboardingCompleted` is `false`.
- New authenticated users without an existing `profiles` row resolve to `tier: "free"` and `onboardingCompleted: false`, never inheriting `"pro"` from `DEFAULT_SETTINGS` or a prior demo session.
- `SubscriptionProfileView.tsx` hides/disables the `"Tester Gratuit / Pro"` toggle and blocks `data.demoMode` self-promotion when `Boolean(settings.email.trim())` is true.
- Automated tests verify all P0-1 transitions (`tests/auth-state.test.ts`).

#### P0-2: Stripe Webhook Cryptographic Verification (M1)
- Missing or placeholder (`"whsec_..."`) `STRIPE_WEBHOOK_SECRET` returns HTTP `500`.
- `POST /api/webhooks/stripe` reads raw payload via `await req.text()` before JSON parsing.
- Missing, malformed, forged, or expired (`> 300s` tolerance) `stripe-signature` headers are rejected with HTTP `400` using HMAC-SHA256 and `crypto.timingSafeEqual` (with length check).
- Valid `stripe-signature` with invalid JSON returns HTTP `400`.
- `checkout.session.completed` supports `customer_email ?? customer_details?.email` and updates `subscription_tier` to `"pro"`; `customer.subscription.deleted` downgrades to `"free"`.
- Supabase `.update()` errors are checked and return HTTP `500`.
- Automated unit and route tests verify all P0-2 cases (`tests/stripe-webhook.test.ts`).

#### P0-3: Isolate `INITIAL_DEMO_SESSIONS` from Real Users (M1)
- Initial `history` state in `src/app/page.tsx` is `[]`, not `INITIAL_DEMO_SESSIONS`.
- `INITIAL_DEMO_SESSIONS` is loaded only when explicitly entering Demo mode (`onEnterDemo`).
- Both `handleSignedInUser` and `onAuthStateChange` unconditionally set `history` (`cloud.sessions ?? []`) and `badges` (`cloud.badges ?? []`), ensuring new users with 0 cloud sessions see `[]`.
- `onAuthSuccess` and `handleSignOut` cleanly reset `history`, `badges`, `checkIns`, `exercises`, `customDays`, and `settings` (`tier: "free"`).
- Automated tests verify all P0-3 state transitions (`tests/auth-state.test.ts`).

#### P1-1: Code Coach Visual Feedback (M2)
- `linkCoachByCode(userId, coachCode)` returns structured `{ ok, coachName?, coachCode?, error? }` result.
- `SubscriptionProfileView.tsx` provides an explicit validation/linking trigger with loading, success (linked coach name/code), and error feedback states.
- Linked coach information persists across reloads via Supabase `profiles.coach_id` / hydration.
- Validated by automated test or explicit independent review.

#### P1-2: Supabase Sync for Custom Exercises & Custom Planning (M2)
- `supabase/schema.sql` defines tables/columns and RLS policies for user-owned custom exercises and custom split days.
- `src/lib/supabase-sync.ts` implements save and fetch helpers (`saveCustomExercisesToCloud`, `saveCustomSplitDaysToCloud`, hydrated in `fetchCloudData`).
- `src/app/page.tsx` syncs custom exercises and custom split days to cloud when authenticated and hydrates them on login without duplicating presets.
- Validated by automated test or explicit independent review.

#### P1-3: Coach Check-ins History (M2)
- `fetchCoachClients` returns `checkIns: CoachingCheckIn[]` ordered descending by `created_at` for each athlete.
- `CoachDashboard.tsx` renders each athlete's check-in history (readiness score, energy, sleep, soreness, post-workout difficulty/notes, timestamps) with empty-state handling.
- Validated by automated test or explicit independent review.

---

## 5. Out-of-Scope / Non-Goals

- **Stripe Customer Portal & Invoice Management**: Self-service billing portal UI is out of scope for M1–M2.
- **Multi-Coach / Organization Hierarchies**: Coaches manage individual athletes via `coach_code`; multi-coach teams are deferred.
- **Offline CRDT Conflict Resolution**: Cloud hydration remains authoritative for authenticated users.
- **Full `CoachDashboard` Redesign**: Only check-in history rendering (P1-3) is in scope for M2.

---

## 6. Release & Verification Gates

| Gate | Required Checks |
|------|-----------------|
| **M1 Gate (P0 + Test Infra)** | `npm.cmd test` passes (P0-1, P0-2, P0-3), `npx.cmd tsc --noEmit` exits `0`, `npm.cmd run lint` exits `0`, `npm.cmd run build` exits `0`. |
| **M2 Gate (P1 Retention)** | All 3 P1 items implemented, covered by automated tests / independent criteria review, plus `tsc --noEmit`, `lint`, and `build` passing. |
| **M3 Gate (Production Release)** | 100% pass on opaque-box E2E test suite + `tsc --noEmit` + `npm.cmd run lint` + `npm.cmd run build`. |
