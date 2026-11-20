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
  registerMockSupabase,
  safeImport,
  unregisterMockSupabase,
  withEnv,
} from "./_helpers.mjs";

describe("Tier 3 — Cross-Feature Pairwise Interactions", () => {
  it("T3-01 (P0-1 x P0-2): Free user upgrades to 'pro' via signed checkout.session.completed webhook and hydrates 'pro'", async () => {
    const variant = "t3-01";
    const client = createMockSupabaseClient({
      profiles: [{ id: "u-1", email: "upgrade@test.fr", subscription_tier: "free" }],
    });
    registerMockSupabase(variant, client);
    try {
      const webhookMod = await safeImport("src/app/api/webhooks/stripe/route.ts", variant);
      const syncMod = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(webhookMod.ok, true, webhookMod.error?.message);
      assert.equal(syncMod.ok, true, syncMod.error?.message);

      const before = await syncMod.mod.fetchCloudData("u-1");
      assert.equal(before.settingsPartial?.tier, "free");

      const secret = "whsec_t3_01_secret";
      const body = JSON.stringify({
        type: "checkout.session.completed",
        data: { object: { customer_email: "upgrade@test.fr", customer: "cus_t3_1", subscription: "sub_t3_1" } },
      });
      const sig = generateStripeSignature(body, secret);

      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-key",
          STRIPE_WEBHOOK_SECRET: secret,
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": sig },
            body,
          });
          const res = await webhookMod.mod.POST(req);
          assert.equal(res.status, 200);
        }
      );

      const after = await syncMod.mod.fetchCloudData("u-1");
      assert.equal(after.settingsPartial?.tier, "pro");
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-02 (P0-1 x P0-2): Pro user downgrades to 'free' via signed customer.subscription.deleted webhook", async () => {
    const variant = "t3-02";
    const client = createMockSupabaseClient({
      profiles: [{ id: "u-2", email: "down@test.fr", subscription_tier: "pro", stripe_customer_id: "cus_t3_2" }],
    });
    registerMockSupabase(variant, client);
    try {
      const webhookMod = await safeImport("src/app/api/webhooks/stripe/route.ts", variant);
      const syncMod = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(webhookMod.ok, true);
      assert.equal(syncMod.ok, true);

      const secret = "whsec_t3_02_secret";
      const body = JSON.stringify({
        type: "customer.subscription.deleted",
        data: { object: { customer: "cus_t3_2" } },
      });
      const sig = generateStripeSignature(body, secret);

      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-key",
          STRIPE_WEBHOOK_SECRET: secret,
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": sig },
            body,
          });
          const res = await webhookMod.mod.POST(req);
          assert.equal(res.status, 200);
        }
      );

      const after = await syncMod.mod.fetchCloudData("u-2");
      assert.equal(after.settingsPartial?.tier, "free");
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-03 (P0-1 x P0-3): New authenticated user starts in 'free' tier AND empty history []", async () => {
    const authRes = await safeImport("src/lib/auth-state.ts");
    assert.equal(authRes.ok, true, "src/lib/auth-state.ts must exist");
    const hydrated = authRes.mod.resolveCloudHydrationState(
      { sessions: [] },
      "brandnew@clubfaouzi.fr"
    );
    assert.equal(hydrated.settings.tier, "free");
    assert.deepEqual(hydrated.history, []);
  });

  it("T3-04 (P0-2 x P0-3): Rejected invalid Stripe webhook leaves profile 'free' and sessions untouched", async () => {
    const variant = "t3-04";
    const client = createMockSupabaseClient({
      profiles: [{ id: "u-4", email: "safe@test.fr", subscription_tier: "free" }],
      workout_sessions: [],
    });
    registerMockSupabase(variant, client);
    try {
      const webhookMod = await safeImport("src/app/api/webhooks/stripe/route.ts", variant);
      assert.equal(webhookMod.ok, true);
      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-key",
          STRIPE_WEBHOOK_SECRET: "whsec_t3_04_secret",
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": "t=123,v1=invalid" },
            body: JSON.stringify({
              type: "checkout.session.completed",
              data: { object: { customer_email: "safe@test.fr" } },
            }),
          });
          const res = await webhookMod.mod.POST(req);
          assert.equal(res.status, 400);
          assert.equal(client.__tables.profiles[0].subscription_tier, "free");
          assert.equal(client.__tables.workout_sessions.length, 0);
        }
      );
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-05 (P1-1 x P1-3): Athlete links via linkCoachByCode then submits check-ins -> visible in fetchCoachClients", async () => {
    const variant = "t3-05";
    const client = createMockSupabaseClient({
      profiles: [
        { id: "coach-1", display_name: "Coach Faouzi", role: "coach", coach_code: "FAOUZI-PRO" },
        { id: "ath-1", display_name: "Mehdi", email: "mehdi@test.fr", role: "athlete", coach_id: null },
      ],
    });
    registerMockSupabase(variant, client);
    try {
      const syncMod = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(syncMod.ok, true);
      assert.equal(typeof syncMod.mod.linkCoachByCode, "function");

      const linkRes = await syncMod.mod.linkCoachByCode("ath-1", "FAOUZI-PRO");
      assert.equal(linkRes.ok, true);

      await syncMod.mod.saveCheckInToCloud("ath-1", {
        id: "chk-1",
        date: "2026-11-18T08:00:00Z",
        fullName: "Mehdi",
        muscleGroup: "Chest",
        sleepStart: "23:00",
        sleepEnd: "07:00",
        sleepQuality: 8,
        sleepDisruptors: [],
        preWorkoutMeal: "breakfast_and_pre",
        hydrated: true,
        caffeinePre: true,
        caffeineEarlier: false,
        caffeineDayBefore: false,
        stress: 3,
        energy: 8,
        motivation: 9,
        readinessScore: 84,
      });

      const clients = await syncMod.mod.fetchCoachClients("coach-1");
      assert.equal(clients.length, 1);
      assert.equal(clients[0].id, "ath-1");
      assert.ok(Array.isArray(clients[0].checkIns));
      assert.equal(clients[0].checkIns.length, 1);
      assert.equal(clients[0].checkIns[0].readinessScore, 84);
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-06 (P1-1 x P0-1): Free-tier athlete links to coach -> fetchCoachClients accurately reports tier 'free'", async () => {
    const variant = "t3-06";
    const client = createMockSupabaseClient({
      profiles: [
        { id: "coach-1", display_name: "Coach", role: "coach", coach_code: "COACH-1" },
        { id: "ath-free", display_name: "Free Ath", email: "free@test.fr", role: "athlete", subscription_tier: "free", coach_id: null },
      ],
    });
    registerMockSupabase(variant, client);
    try {
      const syncMod = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(syncMod.ok, true);
      assert.equal(typeof syncMod.mod.linkCoachByCode, "function");
      await syncMod.mod.linkCoachByCode("ath-free", "COACH-1");
      const clients = await syncMod.mod.fetchCoachClients("coach-1");
      assert.equal(clients[0].tier, "free");
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-07 (P1-2 x P0-3): Athlete with 0 workout sessions saves custom exercises & split days -> sessions stay [] while custom data hydrates", async () => {
    const variant = "t3-07";
    const client = createMockSupabaseClient({
      profiles: [{ id: "u-7", role: "athlete", subscription_tier: "free" }],
    });
    registerMockSupabase(variant, client);
    try {
      const syncMod = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(syncMod.ok, true);
      assert.equal(typeof syncMod.mod.saveCustomExercisesToCloud, "function");
      assert.equal(typeof syncMod.mod.saveCustomSplitDaysToCloud, "function");

      await syncMod.mod.saveCustomExercisesToCloud("u-7", [
        { id: "cx-1", name: "Custom Press", muscleGroup: "Chest", defaultUnit: "kg", defaultSets: [] },
      ]);
      await syncMod.mod.saveCustomSplitDaysToCloud("u-7", [
        { dayIndex: 1, dayLabel: "Jour 1", title: "Chest", isRest: false, exerciseIds: ["cx-1"] },
      ]);

      const cloud = await syncMod.mod.fetchCloudData("u-7");
      assert.deepEqual(cloud.sessions, []);
      assert.equal(cloud.customExercises?.length, 1);
      assert.equal(cloud.customSplitDays?.length, 1);
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-08 (P1-2 x P1-1): Linked athlete with custom exercises & split days hydrates both coachCode and custom data", async () => {
    const variant = "t3-08";
    const client = createMockSupabaseClient({
      profiles: [
        { id: "coach-1", display_name: "Coach Faouzi", role: "coach", coach_code: "FAOUZI-PRO" },
        { id: "u-8", role: "athlete", subscription_tier: "free", coach_id: null },
      ],
    });
    registerMockSupabase(variant, client);
    try {
      const syncMod = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(syncMod.ok, true);
      assert.equal(typeof syncMod.mod.linkCoachByCode, "function");
      assert.equal(typeof syncMod.mod.saveCustomExercisesToCloud, "function");

      await syncMod.mod.linkCoachByCode("u-8", "FAOUZI-PRO");
      await syncMod.mod.saveCustomExercisesToCloud("u-8", [
        { id: "cx-8", name: "Custom Row", muscleGroup: "Dos", defaultUnit: "kg", defaultSets: [] },
      ]);

      const cloud = await syncMod.mod.fetchCloudData("u-8");
      assert.equal(cloud.settingsPartial?.coachCode, "FAOUZI-PRO");
      assert.equal(cloud.customExercises?.length, 1);
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-09 (P1-3 x P1-2): Coach sees both workout sessions and full checkIns[] for linked athlete", async () => {
    const variant = "t3-09";
    const client = createMockSupabaseClient({
      profiles: [
        { id: "coach-1", role: "coach", coach_code: "FAOUZI-PRO" },
        { id: "ath-9", display_name: "Youssef", email: "youssef@test.fr", role: "athlete", coach_id: "coach-1" },
      ],
      workout_sessions: [
        { id: "sess-9", user_id: "ath-9", day_title: "Dos", started_at: "2026-11-18T18:00:00Z" },
      ],
      coaching_checkins: [
        { id: "c-1", user_id: "ath-9", full_name: "Youssef", muscle_group: "Dos", readiness_score: 79, created_at: "2026-11-17T08:00:00Z" },
        { id: "c-2", user_id: "ath-9", full_name: "Youssef", muscle_group: "Dos", readiness_score: 88, created_at: "2026-11-18T08:00:00Z" },
      ],
    });
    registerMockSupabase(variant, client);
    try {
      const syncMod = await safeImport("src/lib/supabase-sync.ts", variant);
      assert.equal(syncMod.ok, true);
      const clients = await syncMod.mod.fetchCoachClients("coach-1");
      assert.equal(clients.length, 1);
      assert.equal(clients[0].sessions.length, 1);
      assert.equal(clients[0].checkIns?.length, 2);
    } finally {
      unregisterMockSupabase(variant);
    }
  });

  it("T3-10 (R1 x Build/TS): PM_SCOPING.md exists alongside clean tsc --noEmit", () => {
    assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
    const tscBin = path.join(PROJECT_ROOT, "node_modules", "typescript", "bin", "tsc");
    const out = execFileSync(process.execPath, [tscBin, "--noEmit"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
    });
    assert.equal(out.trim(), "");
  });
});
