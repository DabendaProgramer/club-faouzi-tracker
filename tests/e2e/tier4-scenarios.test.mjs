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

describe("Tier 4 — Real-World Application Scenarios", () => {
  it("Scenario 1: New Athlete Onboarding & Free Tier Journey (P0-1, P0-3, P1-2)", async () => {
    const variant = "t4-s1";
    const client = createMockSupabaseClient({
      profiles: [
        {
          id: "ath-amina",
          email: "amina@clubfaouzi.fr",
          display_name: "Amina",
          role: "athlete",
          subscription_tier: "free",
          onboarding_completed: true,
        },
      ],
    });
    registerMockSupabase(variant, client);
    try {
      const authRes = await safeImport("src/lib/auth-state.ts");
      const syncRes = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(authRes.ok, true, "src/lib/auth-state.ts must exist");
      assert.equal(syncRes.ok, true, syncRes.error?.message);

      // Step 1: Newly registered athlete starts in 'free' tier with empty history (no demo sessions)
      const cloudInit = await syncRes.mod.fetchCloudData("ath-amina");
      const hydratedInit = authRes.mod.resolveCloudHydrationState(
        cloudInit,
        "amina@clubfaouzi.fr"
      );
      assert.equal(hydratedInit.settings.tier, "free");
      assert.deepEqual(hydratedInit.history, []);

      // Step 2: Athlete creates 2 custom exercises and 1 custom split day
      assert.equal(typeof syncRes.mod.saveCustomExercisesToCloud, "function");
      assert.equal(typeof syncRes.mod.saveCustomSplitDaysToCloud, "function");

      const customExercises = [
        {
          id: "cx-amina-1",
          name: "Hip Thrust Machine",
          muscleGroup: "Legs",
          defaultUnit: "kg",
          defaultSets: [
            { id: "st-1", setType: "top_set", label: "Top Set", targetWeight: 120, targetReps: 10, unit: "kg" },
          ],
        },
        {
          id: "cx-amina-2",
          name: "Élévations Latérales Câble",
          muscleGroup: "Épaules",
          defaultUnit: "kg",
          defaultSets: [],
        },
      ];
      const customDays = [
        {
          dayIndex: 1,
          dayLabel: "Jour 1 · Lower",
          title: "Legs Focus",
          isRest: false,
          exerciseIds: ["cx-amina-1"],
        },
      ];

      await syncRes.mod.saveCustomExercisesToCloud("ath-amina", customExercises);
      await syncRes.mod.saveCustomSplitDaysToCloud("ath-amina", customDays);

      // Step 3: Simulate new device / reload hydration via fetchCloudData
      const cloudReload = await syncRes.mod.fetchCloudData("ath-amina");
      assert.equal(cloudReload.settingsPartial?.tier, "free");
      assert.deepEqual(cloudReload.sessions, []);
      assert.equal(cloudReload.customExercises?.length, 2);
      assert.equal(cloudReload.customSplitDays?.length, 1);
      assert.deepEqual(cloudReload.customSplitDays[0].exerciseIds, ["cx-amina-1"]);
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("Scenario 2: Athlete Upgrades & Downgrades via Signed Stripe Webhook (P0-1, P0-2)", async () => {
    const variant = "t4-s2";
    const client = createMockSupabaseClient({
      profiles: [
        {
          id: "ath-pro-flow",
          email: "upgrade.flow@clubfaouzi.fr",
          role: "athlete",
          subscription_tier: "free",
        },
      ],
    });
    registerMockSupabase(variant, client);
    try {
      const authRes = await safeImport("src/lib/auth-state.ts");
      const checkoutRes = await safeImport("src/app/api/checkout/route.ts");
      const webhookRes = await safeImport("src/app/api/webhooks/stripe/route.ts", variant);
      const syncRes = await safeImport("src/lib/supabase-sync.ts", variant);

      assert.equal(authRes.ok, true, "src/lib/auth-state.ts must exist");
      assert.equal(checkoutRes.ok, true);
      assert.equal(webhookRes.ok, true);
      assert.equal(syncRes.ok, true);

      const secret = "whsec_t4_scenario2_secret";

      // Step 1: Authenticated user cannot self-promote to 'pro' locally
      assert.equal(authRes.mod.canUseDemoTierToggle({ email: "upgrade.flow@clubfaouzi.fr" }), false);
      const guarded = authRes.mod.resolveAuthenticatedSettings(
        { tier: "free" },
        "upgrade.flow@clubfaouzi.fr"
      );
      assert.equal(guarded.tier, "free");

      // Step 2: Checkout endpoint in demo mode returns demoMode: true without mutating tier
      await withEnv(
        { STRIPE_SECRET_KEY: "sk_test_...", NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: "price_..." },
        async () => {
          const chkReq = makeNextRequest("/api/checkout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ plan: "pro_monthly", email: "upgrade.flow@clubfaouzi.fr" }),
          });
          const chkResp = await checkoutRes.mod.POST(chkReq);
          assert.equal(chkResp.status, 200);
          const chkJson = await chkResp.json();
          assert.equal(chkJson.demoMode, true);
        }
      );

      // Step 3: Forged webhook is rejected with 400 and tier stays 'free'
      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-key",
          STRIPE_WEBHOOK_SECRET: secret,
        },
        async () => {
          const forgedReq = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": "t=1750000000,v1=forged" },
            body: JSON.stringify({
              type: "checkout.session.completed",
              data: { object: { customer_email: "upgrade.flow@clubfaouzi.fr", customer: "cus_s2" } },
            }),
          });
          const forgedResp = await webhookRes.mod.POST(forgedReq);
          assert.equal(forgedResp.status, 400);
          assert.equal(client.__tables.profiles[0].subscription_tier, "free");

          // Step 4: Valid signed checkout.session.completed upgrades to 'pro'
          const upgradeBody = JSON.stringify({
            type: "checkout.session.completed",
            data: {
              object: {
                customer_email: "upgrade.flow@clubfaouzi.fr",
                customer: "cus_s2",
                subscription: "sub_s2",
              },
            },
          });
          const upgradeSig = generateStripeSignature(upgradeBody, secret);
          const upgradeReq = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": upgradeSig },
            body: upgradeBody,
          });
          const upgradeResp = await webhookRes.mod.POST(upgradeReq);
          assert.equal(upgradeResp.status, 200);

          const afterUpgrade = await syncRes.mod.fetchCloudData("ath-pro-flow");
          assert.equal(afterUpgrade.settingsPartial?.tier, "pro");

          // Step 5: Valid signed customer.subscription.deleted downgrades back to 'free'
          const cancelBody = JSON.stringify({
            type: "customer.subscription.deleted",
            data: { object: { customer: "cus_s2" } },
          });
          const cancelSig = generateStripeSignature(cancelBody, secret);
          const cancelReq = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": cancelSig },
            body: cancelBody,
          });
          const cancelResp = await webhookRes.mod.POST(cancelReq);
          assert.equal(cancelResp.status, 200);

          const afterCancel = await syncRes.mod.fetchCloudData("ath-pro-flow");
          assert.equal(afterCancel.settingsPartial?.tier, "free");
        }
      );
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("Scenario 3: Athlete-Coach Linking & Multi-Check-In Coaching Loop (P1-1, P1-3)", async () => {
    const variant = "t4-s3";
    const client = createMockSupabaseClient({
      profiles: [
        { id: "coach-faouzi", display_name: "Coach Faouzi", role: "coach", coach_code: "FAOUZI-ELITE" },
        { id: "ath-sofiane", display_name: "Sofiane", email: "sofiane@test.fr", role: "athlete", coach_id: null },
      ],
      coaching_checkins: [],
    });
    registerMockSupabase(variant, client);
    try {
      const syncRes = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(syncRes.ok, true);
      assert.equal(typeof syncRes.mod.linkCoachByCode, "function");

      // Step 1: Athlete enters invalid coach code -> receives error feedback, not linked
      const badLink = await syncRes.mod.linkCoachByCode("ath-sofiane", "INVALID-999");
      assert.equal(badLink.ok, false);
      assert.ok(badLink.error);

      // Step 2: Athlete enters valid coach code with spaces & lowercase -> succeeds
      const goodLink = await syncRes.mod.linkCoachByCode("ath-sofiane", " faouzi-elite ");
      assert.equal(goodLink.ok, true);
      assert.equal(goodLink.coachCode, "FAOUZI-ELITE");
      assert.equal(goodLink.coachName, "Coach Faouzi");

      // Step 3: Athlete reloads -> fetchCloudData retains linked coachCode
      const reloaded = await syncRes.mod.fetchCloudData("ath-sofiane");
      assert.equal(reloaded.settingsPartial?.coachCode, "FAOUZI-ELITE");

      // Step 4: Athlete submits 3 check-ins over 3 days (inserted in chronological order)
      const checkIns = [
        { id: "chk-d1", created_at: "2026-11-16T08:00:00Z", muscle_group: "Biceps", readiness_score: 68 },
        { id: "chk-d2", created_at: "2026-11-17T08:00:00Z", muscle_group: "Legs", readiness_score: 79 },
        { id: "chk-d3", created_at: "2026-11-18T08:00:00Z", muscle_group: "Chest", readiness_score: 91 },
      ];
      for (const c of checkIns) {
        client.__tables.coaching_checkins.push({
          ...c,
          user_id: "ath-sofiane",
          full_name: "Sofiane",
          sleep_quality: 8,
          stress: 3,
          energy: 8,
          motivation: 9,
        });
      }

      // Step 5: Coach fetches clients -> sees Sofiane with all 3 check-ins sorted newest-first
      const clients = await syncRes.mod.fetchCoachClients("coach-faouzi");
      assert.equal(clients.length, 1);
      assert.equal(clients[0].fullName, "Sofiane");
      assert.ok(Array.isArray(clients[0].checkIns));
      assert.deepEqual(
        clients[0].checkIns.map((c) => c.id),
        ["chk-d3", "chk-d2", "chk-d1"]
      );
      assert.equal(clients[0].latestCheckIn?.id, "chk-d3");
      assert.equal(clients[0].latestCheckIn?.readinessScore, 91);
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("Scenario 4: Demo Mode to Authenticated Account Transition (P0-1, P0-3)", async () => {
    const authRes = await safeImport("src/lib/auth-state.ts");
    const presetsRes = await safeImport("src/data/presets.ts");
    assert.equal(authRes.ok, true, "src/lib/auth-state.ts must exist");
    assert.equal(presetsRes.ok, true);

    // Step 1: User explores Demo mode -> sees INITIAL_DEMO_SESSIONS
    const demoState = authRes.mod.resolveDemoEntryState(authRes.mod.DEFAULT_SETTINGS);
    assert.equal(demoState.history.length, presetsRes.mod.INITIAL_DEMO_SESSIONS.length);
    assert.ok(demoState.history.some((s) => s.id.startsWith("demo-sess-")));

    // Step 2: User signs up / signs in as real account with 0 cloud sessions
    const authState = authRes.mod.resolveAuthSuccessState("real.user@clubfaouzi.fr");
    assert.deepEqual(authState.history, []);
    assert.equal(authState.settings.tier, "free");

    // Step 3: User signs out -> history remains empty (no demo session leakage)
    const postSignOutState = authRes.mod.createSignedOutResetState();
    assert.deepEqual(postSignOutState.history, []);
    assert.equal(postSignOutState.settings.tier, "free");
  });

  it("Scenario 5: Production Readiness Gate Health Check (R1, Build/TS, Schema RLS)", () => {
    // 1. PM Scoping doc exists & covers P0/P1
    assert.equal(projectFileExists("docs/PM_SCOPING.md"), true, "docs/PM_SCOPING.md must exist");
    const pmDoc = readProjectFile("docs/PM_SCOPING.md");
    assert.match(pmDoc, /P0/i);
    assert.match(pmDoc, /P1/i);

    // 2. Schema enables RLS on all core and custom tables
    const schema = readProjectFile("supabase/schema.sql");
    assert.match(schema, /alter table public\.profiles enable row level security/i);
    assert.match(schema, /alter table public\.workout_sessions enable row level security/i);
    assert.match(schema, /alter table public\.coaching_checkins enable row level security/i);
    assert.match(schema, /custom_exercises/i);
    assert.match(schema, /custom_split_days/i);

    // 3. .env.example documents required Stripe and Supabase variables
    const envEx = readProjectFile(".env.example");
    for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ]) {
      assert.match(envEx, new RegExp(`^${key}=`, "m"));
    }

    // 4. TypeScript strict check passes
    const tscBin = path.join(PROJECT_ROOT, "node_modules", "typescript", "bin", "tsc");
    const out = execFileSync(process.execPath, [tscBin, "--noEmit"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    });
    assert.equal(out.trim(), "");
  });
});
