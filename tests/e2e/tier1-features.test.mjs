import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  PROJECT_ROOT,
  createMockSupabaseClient,
  generateStripeSignature,
  makeNextRequest,
  projectFileExists,
  readProjectFile,
  registerMockSupabase,
  safeImport,
  unregisterMockSupabase,
  withEnv,
} from "./_helpers.mjs";

describe("Tier 1 — Feature Coverage", () => {
  // =========================================================================
  // Feature 1: PM Scoping Document (docs/PM_SCOPING.md)
  // =========================================================================
  describe("Feature 1: PM Scoping Document (docs/PM_SCOPING.md)", () => {
    it("T1-F1-01: docs/PM_SCOPING.md exists and is substantial", () => {
      assert.equal(
        projectFileExists("docs/PM_SCOPING.md"),
        true,
        "docs/PM_SCOPING.md must exist"
      );
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.ok(content.trim().length > 500, "PM_SCOPING.md must be non-trivial (>500 chars)");
    });

    it("T1-F1-02: documents all three P0 fixes (free tier, stripe-signature, demo isolation)", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.match(content, /free/i, "Must document default 'free' tier P0");
      assert.match(content, /stripe[- ]signature|webhook/i, "Must document Stripe webhook signature P0");
      assert.match(content, /INITIAL_DEMO_SESSIONS|demo/i, "Must document INITIAL_DEMO_SESSIONS isolation P0");
    });

    it("T1-F1-03: documents all three P1 items (Code Coach feedback, Supabase sync, Coach check-ins)", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.match(content, /coach/i, "Must document Code Coach feedback P1");
      assert.match(content, /supabase|exercice|split|planning/i, "Must document Supabase exercises/planning sync P1");
      assert.match(content, /check[- ]?in/i, "Must document Coach check-ins history P1");
    });

    it("T1-F1-04: includes explicit P0 vs P1 prioritization rationale", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.match(content, /P0/i);
      assert.match(content, /P1/i);
      assert.match(content, /priorit|arbitrage|périmètre|scope|justification/i);
    });

    it("T1-F1-05: documents production risks and rollout/verification plan", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.match(content, /risque|risk/i, "Must document production risks");
      assert.match(content, /rollout|release|gate|déploiement|mise en production|vérification|verification/i, "Must document rollout/verification plan");
    });
  });

  // =========================================================================
  // Feature 2: TypeScript & Build Health
  // =========================================================================
  describe("Feature 2: TypeScript & Build Health", () => {
    it("T1-F2-01: tsconfig.json enforces strict mode, noEmit, and @/* alias", () => {
      const tsconfig = JSON.parse(readProjectFile("tsconfig.json"));
      assert.equal(tsconfig.compilerOptions?.strict, true);
      assert.equal(tsconfig.compilerOptions?.noEmit, true);
      assert.deepEqual(tsconfig.compilerOptions?.paths?.["@/*"], ["./src/*"]);
    });

    it("T1-F2-02: package.json configures build, lint, and test scripts", () => {
      const pkg = JSON.parse(readProjectFile("package.json"));
      assert.ok(pkg.scripts?.build, "package.json must define build script");
      assert.ok(pkg.scripts?.lint, "package.json must define lint script");
      assert.ok(pkg.scripts?.test, "package.json must define test script");
    });

    it("T1-F2-03: tsc --noEmit exits 0 with zero TypeScript errors", () => {
      const tscBin = path.join(PROJECT_ROOT, "node_modules", "typescript", "bin", "tsc");
      const out = execFileSync(process.execPath, [tscBin, "--noEmit"], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
      });
      assert.equal(out.trim(), "");
    });

    it("T1-F2-04: workout-engine.ts loads and exports core calculation contracts", async () => {
      const res = await safeImport("src/lib/workout-engine.ts");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(typeof res.mod.estimate1RM, "function");
      assert.equal(typeof res.mod.roundToStep, "function");
      assert.equal(typeof res.mod.getBestTopSet, "function");
      assert.equal(res.mod.roundToStep(100.3, 0.5), 100.5);
    });

    it("T1-F2-05: POST /api/checkout returns demoMode=true when Stripe keys are placeholder", async () => {
      const res = await safeImport("src/app/api/checkout/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      await withEnv(
        {
          STRIPE_SECRET_KEY: "sk_test_...",
          NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: "price_...",
        },
        async () => {
          const req = makeNextRequest("/api/checkout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ plan: "pro_monthly", email: "athlete@test.fr" }),
          });
          const response = await res.mod.POST(req);
          assert.equal(response.status, 200);
          const json = await response.json();
          assert.equal(json.demoMode, true);
          assert.equal(json.plan, "pro_monthly");
        }
      );
    });
  });

  // =========================================================================
  // Feature 3: P0-1 Default Tier 'free' & Auth Tier Guard
  // =========================================================================
  describe("Feature 3: P0-1 Default Tier 'free' & Auth Tier Guard", () => {
    it("T1-F3-01: supabase/schema.sql defaults profiles.subscription_tier to 'free'", () => {
      const schema = readProjectFile("supabase/schema.sql");
      assert.match(
        schema,
        /subscription_tier\s+text\s+not\s+null\s+default\s+'free'/i
      );
    });

    it("T1-F3-02: src/lib/auth-state.ts exists and exports state resolution helpers", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist and load");
      const exportedFns = Object.keys(res.mod).filter(
        (k) => typeof res.mod[k] === "function"
      );
      assert.ok(exportedFns.length >= 1, "auth-state.ts must export pure state helpers");
    });

    it("T1-F3-03: default and newly authenticated user settings resolve tier === 'free'", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      assert.equal(res.mod.DEFAULT_SETTINGS.tier, "free");
      const resolved = res.mod.resolveAuthenticatedSettings(undefined, "newuser@clubfaouzi.fr");
      assert.equal(resolved.tier, "free");
      const authSuccess = res.mod.resolveAuthSuccessState("newuser@clubfaouzi.fr");
      assert.equal(authSuccess.settings.tier, "free");
    });

    it("T1-F3-04: fetchCloudData maps profile without 'pro' to 'free' and 'pro' to 'pro'", async () => {
      const variant = "t1-f3-04";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "u-free", email: "free@test.fr", subscription_tier: "free" },
          { id: "u-pro", email: "pro@test.fr", subscription_tier: "pro" },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const freeCloud = await res.mod.fetchCloudData("u-free");
        const proCloud = await res.mod.fetchCloudData("u-pro");
        assert.equal(freeCloud.settingsPartial?.tier, "free");
        assert.equal(proCloud.settingsPartial?.tier, "pro");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F3-05: page.tsx does not default tier to 'pro' and SubscriptionProfileView guards client tier toggle", () => {
      const pageSrc = readProjectFile("src/app/page.tsx");
      assert.doesNotMatch(
        pageSrc,
        /DEFAULT_SETTINGS[\s\S]*?tier:\s*["']pro["']/,
        "DEFAULT_SETTINGS in page.tsx must not default tier to 'pro'"
      );
      const profileSrc = readProjectFile("src/components/SubscriptionProfileView.tsx");
      // Authenticated users must not have an unguarded client-side toggle flipping tier to "pro"
      const hasEmailGuard =
        /!settings\.email/.test(profileSrc) ||
        /isAuthenticated/.test(profileSrc) ||
        /canToggleDemoTier/.test(profileSrc) ||
        !/Tester Pro/.test(profileSrc);
      assert.equal(
        hasEmailGuard,
        true,
        "SubscriptionProfileView must guard or remove client-side 'Tester Pro' toggle for authenticated users"
      );
    });
  });

  // =========================================================================
  // Feature 4: P0-2 Stripe Webhook stripe-signature Verification
  // =========================================================================
  describe("Feature 4: P0-2 Stripe Webhook stripe-signature Verification", () => {
    it("T1-F4-01: .env.example declares STRIPE_WEBHOOK_SECRET", () => {
      const envExample = readProjectFile(".env.example");
      assert.match(envExample, /^STRIPE_WEBHOOK_SECRET=/m);
    });

    it("T1-F4-02: src/lib/stripe-webhook.ts exports verifyStripeSignature", async () => {
      const res = await safeImport("src/lib/stripe-webhook.ts");
      assert.equal(res.ok, true, "src/lib/stripe-webhook.ts must exist");
      assert.equal(typeof res.mod.verifyStripeSignature, "function");
    });

    it("T1-F4-03: verifyStripeSignature returns { valid: true } for valid HMAC-SHA256 signature", async () => {
      const res = await safeImport("src/lib/stripe-webhook.ts");
      assert.equal(res.ok, true, "src/lib/stripe-webhook.ts must exist");
      const secret = "whsec_test_secret_123456";
      const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
      const now = 1_750_000_000;
      const sig = generateStripeSignature(body, secret, now);
      const result = res.mod.verifyStripeSignature(body, sig, secret, now + 10);
      assert.equal(result.valid, true);
    });

    it("T1-F4-04: POST /api/webhooks/stripe rejects missing stripe-signature with HTTP 400", async () => {
      const res = await safeImport("src/app/api/webhooks/stripe/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-role-key-for-test",
          STRIPE_WEBHOOK_SECRET: "whsec_real_test_secret_abc",
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "checkout.session.completed" }),
          });
          const response = await res.mod.POST(req);
          assert.equal(response.status, 400);
        }
      );
    });

    it("T1-F4-05: POST /api/webhooks/stripe accepts valid signature, returns 200, and upgrades profile to 'pro'", async () => {
      const variant = "t1-f4-05";
      const client = createMockSupabaseClient({
        profiles: [
          {
            id: "u-1",
            email: "buyer@clubfaouzi.fr",
            subscription_tier: "free",
          },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/app/api/webhooks/stripe/route.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const secret = "whsec_real_test_secret_xyz";
        const body = JSON.stringify({
          type: "checkout.session.completed",
          data: {
            object: {
              customer_email: "buyer@clubfaouzi.fr",
              customer: "cus_123",
              subscription: "sub_123",
            },
          },
        });
        const sig = generateStripeSignature(body, secret);
        await withEnv(
          {
            NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "real-service-role-key-for-test",
            STRIPE_WEBHOOK_SECRET: secret,
          },
          async () => {
            const req = makeNextRequest("/api/webhooks/stripe", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "stripe-signature": sig,
              },
              body,
            });
            const response = await res.mod.POST(req);
            assert.equal(response.status, 200);
            const json = await response.json();
            assert.equal(json.received, true);
            assert.equal(client.__tables.profiles[0].subscription_tier, "pro");
            assert.equal(client.__tables.profiles[0].stripe_customer_id, "cus_123");
          }
        );
      } finally {
        unregisterMockSupabase(variant);
      }
    });
  });

  // =========================================================================
  // Feature 5: P0-3 INITIAL_DEMO_SESSIONS Isolation
  // =========================================================================
  describe("Feature 5: P0-3 INITIAL_DEMO_SESSIONS Isolation", () => {
    it("T1-F5-01: INITIAL_DEMO_SESSIONS defines the 2 demo sessions", async () => {
      const res = await safeImport("src/data/presets.ts");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(res.mod.INITIAL_DEMO_SESSIONS.length, 2);
      const ids = res.mod.INITIAL_DEMO_SESSIONS.map((s) => s.id);
      assert.ok(ids.includes("demo-sess-biceps-prev"));
      assert.ok(ids.includes("demo-sess-legs-prev"));
    });

    it("T1-F5-02: authenticated user with 0 cloud sessions resolves to empty history []", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const hydrated = res.mod.resolveCloudHydrationState({ sessions: [] }, "new@test.fr");
      assert.deepEqual(hydrated.history, []);
      const authSuccess = res.mod.resolveAuthSuccessState("new@test.fr");
      assert.deepEqual(authSuccess.history, []);
    });

    it("T1-F5-03: explicit demo mode resolves to INITIAL_DEMO_SESSIONS", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const presets = await safeImport("src/data/presets.ts");
      const demoState = res.mod.resolveDemoEntryState(res.mod.DEFAULT_SETTINGS);
      assert.equal(demoState.history.length, presets.mod.INITIAL_DEMO_SESSIONS.length);
    });

    it("T1-F5-04: authenticated user with cloud sessions resolves only cloud sessions (no demo sessions)", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const cloudSess = [{ id: "cloud-1", date: "2026-11-19T10:00:00Z", dayTitle: "Chest", sets: [] }];
      const hydrated = res.mod.resolveCloudHydrationState({ sessions: cloudSess }, "u@test.fr");
      assert.equal(hydrated.history.length, 1);
      assert.equal(hydrated.history[0].id, "cloud-1");
      assert.ok(!hydrated.history.some((s) => s.id.startsWith("demo-sess-")));
    });

    it("T1-F5-05: page.tsx does not unconditionally seed authenticated state with INITIAL_DEMO_SESSIONS", () => {
      const pageSrc = readProjectFile("src/app/page.tsx");
      assert.doesNotMatch(
        pageSrc,
        /useState<WorkoutSession\[\]>\(\s*INITIAL_DEMO_SESSIONS\s*\)/,
        "page.tsx must not unconditionally initialize history with INITIAL_DEMO_SESSIONS"
      );
    });
  });

  // =========================================================================
  // Feature 6: P1-1 Code Coach Visual Feedback & Linking
  // =========================================================================
  describe("Feature 6: P1-1 Code Coach Visual Feedback & Linking", () => {
    it("T1-F6-01: supabase-sync.ts exports linkCoachByCode", async () => {
      const res = await safeImport("src/lib/supabase-sync.ts");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(typeof res.mod.linkCoachByCode, "function");
    });

    it("T1-F6-02: linkCoachByCode links athlete to matching coach and returns { ok: true, coachName, coachCode }", async () => {
      const variant = "t1-f6-02";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", display_name: "Coach Faouzi", role: "coach", coach_code: "FAOUZI-PRO" },
          { id: "ath-1", display_name: "Yassine", role: "athlete", coach_id: null },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.linkCoachByCode, "function");
        const result = await res.mod.linkCoachByCode("ath-1", "FAOUZI-PRO");
        assert.equal(result.ok, true);
        assert.equal(result.coachCode, "FAOUZI-PRO");
        assert.equal(result.coachName, "Coach Faouzi");
        const ath = client.__tables.profiles.find((p) => p.id === "ath-1");
        assert.equal(ath.coach_id, "coach-1");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F6-03: linkCoachByCode trims whitespace and normalizes lowercase coach code", async () => {
      const variant = "t1-f6-03";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", display_name: "Coach Faouzi", role: "coach", coach_code: "FAOUZI-PRO" },
          { id: "ath-1", display_name: "Yassine", role: "athlete", coach_id: null },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.linkCoachByCode, "function");
        const result = await res.mod.linkCoachByCode("ath-1", "  faouzi-pro  ");
        assert.equal(result.ok, true);
        assert.equal(result.coachCode, "FAOUZI-PRO");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F6-04: fetchCloudData hydrates linked coach code for athlete on reload", async () => {
      const variant = "t1-f6-04";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", display_name: "Coach Faouzi", role: "coach", coach_code: "FAOUZI-PRO" },
          { id: "ath-1", display_name: "Yassine", role: "athlete", coach_id: "coach-1", subscription_tier: "free" },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const cloud = await res.mod.fetchCloudData("ath-1");
        assert.equal(cloud.settingsPartial?.coachCode, "FAOUZI-PRO");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F6-05: SubscriptionProfileView.tsx renders explicit link button and feedback states", () => {
      const src = readProjectFile("src/components/SubscriptionProfileView.tsx");
      assert.match(src, /onLinkCoach|linkCoachByCode/, "Must wire explicit coach linking action");
      assert.match(src, /<button[\s\S]*?(Valider|Lier|Associer|Connecter)/i, "Must render explicit validation/link button");
    });
  });

  // =========================================================================
  // Feature 7: P1-2 Supabase Sync (Custom Exercises & Split Days)
  // =========================================================================
  describe("Feature 7: P1-2 Supabase Sync (Custom Exercises & Split Days)", () => {
    it("T1-F7-01: supabase/schema.sql defines custom exercises & split days tables with RLS enabled", () => {
      const schema = readProjectFile("supabase/schema.sql");
      assert.match(schema, /custom_exercises/i, "schema.sql must define custom_exercises");
      assert.match(schema, /custom_split_days/i, "schema.sql must define custom_split_days");
      assert.match(schema, /enable row level security/i);
    });

    it("T1-F7-02: supabase-sync.ts exports saveCustomExercisesToCloud and saveCustomSplitDaysToCloud", async () => {
      const res = await safeImport("src/lib/supabase-sync.ts");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(typeof res.mod.saveCustomExercisesToCloud, "function");
      assert.equal(typeof res.mod.saveCustomSplitDaysToCloud, "function");
    });

    it("T1-F7-03: saveCustomExercisesToCloud + fetchCloudData round-trips custom exercises with defaultSets", async () => {
      const variant = "t1-f7-03";
      const client = createMockSupabaseClient({
        profiles: [{ id: "u-1", role: "athlete", subscription_tier: "free" }],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.saveCustomExercisesToCloud, "function");
        const customExercises = [
          {
            id: "custom-ex-1",
            name: "Curl Pupitre Unilatéral",
            muscleGroup: "Biceps",
            defaultUnit: "kg",
            defaultSets: [
              { id: "s1", setType: "top_set", label: "Top Set", targetWeight: 18, targetReps: 10, unit: "kg" },
            ],
          },
        ];
        await res.mod.saveCustomExercisesToCloud("u-1", customExercises);
        const cloud = await res.mod.fetchCloudData("u-1");
        assert.ok(Array.isArray(cloud.customExercises), "fetchCloudData must return customExercises array");
        assert.equal(cloud.customExercises.length, 1);
        assert.equal(cloud.customExercises[0].id, "custom-ex-1");
        assert.equal(cloud.customExercises[0].name, "Curl Pupitre Unilatéral");
        assert.equal(cloud.customExercises[0].defaultSets.length, 1);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F7-04: saveCustomSplitDaysToCloud + fetchCloudData round-trips custom split days with exerciseIds", async () => {
      const variant = "t1-f7-04";
      const client = createMockSupabaseClient({
        profiles: [{ id: "u-1", role: "athlete", subscription_tier: "free" }],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.saveCustomSplitDaysToCloud, "function");
        const customDays = [
          {
            dayIndex: 1,
            dayLabel: "Jour 1 · Push",
            title: "Chest & Épaules",
            isRest: false,
            exerciseIds: ["ex-incline-smith", "custom-ex-1"],
          },
        ];
        await res.mod.saveCustomSplitDaysToCloud("u-1", customDays);
        const cloud = await res.mod.fetchCloudData("u-1");
        assert.ok(Array.isArray(cloud.customSplitDays), "fetchCloudData must return customSplitDays array");
        assert.equal(cloud.customSplitDays.length, 1);
        assert.equal(cloud.customSplitDays[0].title, "Chest & Épaules");
        assert.deepEqual(cloud.customSplitDays[0].exerciseIds, ["ex-incline-smith", "custom-ex-1"]);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F7-05: page.tsx invokes saveCustomExercisesToCloud and saveCustomSplitDaysToCloud", () => {
      const pageSrc = readProjectFile("src/app/page.tsx");
      assert.match(pageSrc, /saveCustomExercisesToCloud/);
      assert.match(pageSrc, /saveCustomSplitDaysToCloud/);
    });
  });

  // =========================================================================
  // Feature 8: P1-3 Coach Check-ins History
  // =========================================================================
  describe("Feature 8: P1-3 Coach Check-ins History", () => {
    it("T1-F8-01: CoachClientSummary in src/types/workout.ts includes checkIns array", () => {
      const typesSrc = readProjectFile("src/types/workout.ts");
      assert.match(typesSrc, /checkIns\??:\s*CoachingCheckIn\[\]/);
    });

    it("T1-F8-02: fetchCoachClients returns full checkIns[] array for linked athlete", async () => {
      const variant = "t1-f8-02";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", role: "coach", coach_code: "FAOUZI-PRO" },
          { id: "ath-1", display_name: "Karim", email: "karim@test.fr", role: "athlete", coach_id: "coach-1", subscription_tier: "pro" },
        ],
        coaching_checkins: [
          { id: "c1", user_id: "ath-1", full_name: "Karim", muscle_group: "Biceps", readiness_score: 70, created_at: "2026-11-10T09:00:00Z" },
          { id: "c2", user_id: "ath-1", full_name: "Karim", muscle_group: "Legs", readiness_score: 85, created_at: "2026-11-12T09:00:00Z" },
          { id: "c3", user_id: "ath-1", full_name: "Karim", muscle_group: "Dos", readiness_score: 90, created_at: "2026-11-15T09:00:00Z" },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const clients = await res.mod.fetchCoachClients("coach-1");
        assert.equal(clients.length, 1);
        assert.ok(Array.isArray(clients[0].checkIns), "checkIns must be an array");
        assert.equal(clients[0].checkIns.length, 3);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F8-03: fetchCoachClients orders checkIns descending by created_at and latestCheckIn === checkIns[0]", async () => {
      const variant = "t1-f8-03";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", role: "coach", coach_code: "FAOUZI-PRO" },
          { id: "ath-1", display_name: "Karim", email: "karim@test.fr", role: "athlete", coach_id: "coach-1" },
        ],
        coaching_checkins: [
          { id: "c-old", user_id: "ath-1", full_name: "Karim", muscle_group: "Biceps", readiness_score: 65, created_at: "2026-11-01T09:00:00Z" },
          { id: "c-new", user_id: "ath-1", full_name: "Karim", muscle_group: "Chest", readiness_score: 92, created_at: "2026-11-18T09:00:00Z" },
          { id: "c-mid", user_id: "ath-1", full_name: "Karim", muscle_group: "Legs", readiness_score: 78, created_at: "2026-11-10T09:00:00Z" },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const clients = await res.mod.fetchCoachClients("coach-1");
        assert.ok(Array.isArray(clients[0].checkIns));
        assert.deepEqual(
          clients[0].checkIns.map((c) => c.id),
          ["c-new", "c-mid", "c-old"]
        );
        assert.equal(clients[0].latestCheckIn?.id, clients[0].checkIns[0].id);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F8-04: fetchCoachClients maps check-in readiness, sleep, energy, stress, and motivation fields", async () => {
      const variant = "t1-f8-04";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", role: "coach" },
          { id: "ath-1", display_name: "Nadia", email: "nadia@test.fr", role: "athlete", coach_id: "coach-1" },
        ],
        coaching_checkins: [
          {
            id: "c1",
            user_id: "ath-1",
            full_name: "Nadia",
            muscle_group: "Épaules",
            sleep_quality: 9,
            stress: 2,
            energy: 8,
            motivation: 10,
            readiness_score: 88,
            created_at: "2026-11-19T08:00:00Z",
          },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const clients = await res.mod.fetchCoachClients("coach-1");
        assert.ok(Array.isArray(clients[0].checkIns));
        const chk = clients[0].checkIns[0];
        assert.equal(chk.sleepQuality, 9);
        assert.equal(chk.stress, 2);
        assert.equal(chk.energy, 8);
        assert.equal(chk.motivation, 10);
        assert.equal(chk.readinessScore, 88);
        assert.equal(chk.muscleGroup, "Épaules");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T1-F8-05: CoachDashboard.tsx renders checkIns history for selected athlete", () => {
      const coachSrc = readProjectFile("src/components/CoachDashboard.tsx");
      assert.match(coachSrc, /\.checkIns/, "CoachDashboard.tsx must reference checkIns array to render history");
    });
  });
});
