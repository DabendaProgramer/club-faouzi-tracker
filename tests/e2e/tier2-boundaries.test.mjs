import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
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

describe("Tier 2 — Boundary & Corner Cases", () => {
  // =========================================================================
  // Feature 1 Boundaries: PM Scoping Document
  // =========================================================================
  describe("Feature 1 Boundaries: PM Scoping Document", () => {
    it("T2-F1-01: PM_SCOPING.md contains no leftover TBD or TODO placeholders", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.doesNotMatch(content, /\b(TBD|TODO|FIXME|\[placeholder\])\b/i);
    });

    it("T2-F1-02: PM_SCOPING.md has structured markdown headings (# / ##)", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      const headings = content.match(/^#{1,3}\s+.+/gm) ?? [];
      assert.ok(headings.length >= 3, "PM_SCOPING.md must have at least 3 markdown headings");
    });

    it("T2-F1-03: PM_SCOPING.md explicitly maps R1/R2/R3 or P0/P1 acceptance criteria", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.match(content, /P0/);
      assert.match(content, /P1/);
    });

    it("T2-F1-04: PM_SCOPING.md includes mitigation or rollback guidance for production", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.match(content, /mitigation|rollback|plan|stratégie|mesure/i);
    });

    it("T2-F1-05: PM_SCOPING.md references Stripe, Supabase, and Demo isolation", () => {
      assert.equal(projectFileExists("docs/PM_SCOPING.md"), true);
      const content = readProjectFile("docs/PM_SCOPING.md");
      assert.match(content, /stripe/i);
      assert.match(content, /supabase/i);
      assert.match(content, /demo/i);
    });
  });

  // =========================================================================
  // Feature 2 Boundaries: TypeScript, Workout Engine & Checkout API
  // =========================================================================
  describe("Feature 2 Boundaries: Workout Engine & Checkout API", () => {
    it("T2-F2-01: estimate1RM handles 0 weight, 1 rep, and high reps without NaN", async () => {
      const res = await safeImport("src/lib/workout-engine.ts");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(res.mod.estimate1RM(0, 10), 0);
      assert.equal(res.mod.estimate1RM(100, 1), 100);
      assert.ok(Number.isFinite(res.mod.estimate1RM(80, 12)));
    });

    it("T2-F2-02: roundToStep handles 0 and non-standard rounding steps cleanly", async () => {
      const res = await safeImport("src/lib/workout-engine.ts");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(res.mod.roundToStep(0, 0.5), 0);
      assert.equal(res.mod.roundToStep(61.2, 2.5), 60);
      assert.equal(res.mod.roundToStep(61.3, 2.5), 62.5);
    });

    it("T2-F2-03: getBestTopSet returns null on empty sets array", async () => {
      const res = await safeImport("src/lib/workout-engine.ts");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(res.mod.getBestTopSet([]), null);
    });

    it("T2-F2-04: POST /api/checkout returns 500 on malformed JSON body", async () => {
      const res = await safeImport("src/app/api/checkout/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      const req = makeNextRequest("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-valid-json",
      });
      const response = await res.mod.POST(req);
      assert.equal(response.status, 500);
    });

    it("T2-F2-05: POST /api/checkout in demoMode handles missing email and default plan", async () => {
      const res = await safeImport("src/app/api/checkout/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      await withEnv(
        { STRIPE_SECRET_KEY: undefined, NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: undefined },
        async () => {
          const req = makeNextRequest("/api/checkout", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
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
  // Feature 3 Boundaries: P0-1 Default Tier 'free' & Guard
  // =========================================================================
  describe("Feature 3 Boundaries: P0-1 Default Tier 'free' & Guard", () => {
    it("T2-F3-01: fetchCloudData coerces unknown subscription_tier values to 'free'", async () => {
      const variant = "t2-f3-01";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "u-unknown", email: "x@test.fr", subscription_tier: "enterprise" },
          { id: "u-null", email: "y@test.fr", subscription_tier: null },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const r1 = await res.mod.fetchCloudData("u-unknown");
        const r2 = await res.mod.fetchCloudData("u-null");
        assert.equal(r1.settingsPartial?.tier, "free");
        assert.equal(r2.settingsPartial?.tier, "free");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F3-02: fetchCloudData with missing profile row returns undefined settingsPartial without crashing", async () => {
      const variant = "t2-f3-02";
      const client = createMockSupabaseClient({ profiles: [] });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const cloud = await res.mod.fetchCloudData("missing-user");
        assert.equal(cloud.settingsPartial, undefined);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F3-03: auth-state resolves new user with undefined cloud profile to tier 'free'", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const out = res.mod.resolveAuthenticatedSettings(undefined, "fresh@clubfaouzi.fr");
      assert.equal(out.tier, "free");
    });

    it("T2-F3-04: auth-state blocks client-side tier override to 'pro' when user is authenticated", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      assert.equal(res.mod.canUseDemoTierToggle({ email: "auth@clubfaouzi.fr" }), false);
      assert.equal(res.mod.canUseDemoTierToggle({ email: "   " }), true);
      const out = res.mod.resolveAuthenticatedSettings({ tier: "free" }, "auth@clubfaouzi.fr");
      assert.equal(out.tier, "free");
    });

    it("T2-F3-05: auth-state preserves 'pro' when cloud profile explicitly has tier 'pro'", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const out = res.mod.resolveAuthenticatedSettings({ tier: "pro" }, "pro@clubfaouzi.fr");
      assert.equal(out.tier, "pro");
    });
  });

  // =========================================================================
  // Feature 4 Boundaries: P0-2 Stripe Webhook Signature
  // =========================================================================
  describe("Feature 4 Boundaries: P0-2 Stripe Webhook Signature", () => {
    it("T2-F4-01: POST /api/webhooks/stripe returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
      const res = await safeImport("src/app/api/webhooks/stripe/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-role-key",
          STRIPE_WEBHOOK_SECRET: undefined,
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": "t=1,v1=abc" },
            body: "{}",
          });
          const response = await res.mod.POST(req);
          assert.equal(response.status, 500);
        }
      );
    });

    it("T2-F4-02: POST /api/webhooks/stripe returns 500 when STRIPE_WEBHOOK_SECRET is placeholder 'whsec_...'", async () => {
      const res = await safeImport("src/app/api/webhooks/stripe/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-role-key",
          STRIPE_WEBHOOK_SECRET: "whsec_...",
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": "t=1,v1=abc" },
            body: "{}",
          });
          const response = await res.mod.POST(req);
          assert.equal(response.status, 500);
        }
      );
    });

    it("T2-F4-03: POST /api/webhooks/stripe returns 400 on tampered body even with valid-format signature", async () => {
      const res = await safeImport("src/app/api/webhooks/stripe/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      const secret = "whsec_real_secret_tamper";
      const originalBody = JSON.stringify({ type: "checkout.session.completed", data: { object: { customer_email: "a@b.fr" } } });
      const tamperedBody = JSON.stringify({ type: "checkout.session.completed", data: { object: { customer_email: "hacker@b.fr" } } });
      const sig = generateStripeSignature(originalBody, secret);

      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-role-key",
          STRIPE_WEBHOOK_SECRET: secret,
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": sig },
            body: tamperedBody,
          });
          const response = await res.mod.POST(req);
          assert.equal(response.status, 400);
        }
      );
    });

    it("T2-F4-04: POST /api/webhooks/stripe returns 400 on expired timestamp (>300s old)", async () => {
      const res = await safeImport("src/app/api/webhooks/stripe/route.ts");
      assert.equal(res.ok, true, res.error?.message);
      const secret = "whsec_real_secret_expired";
      const body = JSON.stringify({ type: "checkout.session.completed" });
      const expiredTs = Math.floor(Date.now() / 1000) - 600;
      const sig = generateStripeSignature(body, secret, expiredTs);

      await withEnv(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "real-service-role-key",
          STRIPE_WEBHOOK_SECRET: secret,
        },
        async () => {
          const req = makeNextRequest("/api/webhooks/stripe", {
            method: "POST",
            headers: { "stripe-signature": sig },
            body,
          });
          const response = await res.mod.POST(req);
          assert.equal(response.status, 400);
        }
      );
    });

    it("T2-F4-05: verifyStripeSignature rejects malformed headers and wrong secret", async () => {
      const res = await safeImport("src/lib/stripe-webhook.ts");
      assert.equal(res.ok, true, "src/lib/stripe-webhook.ts must exist");
      const now = 1_750_000_000;
      const body = "{}";
      assert.equal(res.mod.verifyStripeSignature(body, null, "whsec_a", now).valid, false);
      assert.equal(res.mod.verifyStripeSignature(body, "", "whsec_a", now).valid, false);
      assert.equal(res.mod.verifyStripeSignature(body, "t=notanumber,v1=deadbeef", "whsec_a", now).valid, false);
      const sigWrongSecret = generateStripeSignature(body, "whsec_wrong", now);
      assert.equal(res.mod.verifyStripeSignature(body, sigWrongSecret, "whsec_a", now).valid, false);
    });

    it("T2-F4-06: POST /api/webhooks/stripe handles customer.subscription.deleted and downgrades 'pro' to 'free'", async () => {
      const variant = "t2-f4-06";
      const client = createMockSupabaseClient({
        profiles: [
          {
            id: "u-sub",
            email: "sub@clubfaouzi.fr",
            subscription_tier: "pro",
            stripe_customer_id: "cus_del_1",
          },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/app/api/webhooks/stripe/route.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const secret = "whsec_real_secret_delete";
        const body = JSON.stringify({
          type: "customer.subscription.deleted",
          data: { object: { customer: "cus_del_1" } },
        });
        const sig = generateStripeSignature(body, secret);
        await withEnv(
          {
            NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "real-service-role-key",
            STRIPE_WEBHOOK_SECRET: secret,
          },
          async () => {
            const req = makeNextRequest("/api/webhooks/stripe", {
              method: "POST",
              headers: { "stripe-signature": sig },
              body,
            });
            const response = await res.mod.POST(req);
            assert.equal(response.status, 200);
            assert.equal(client.__tables.profiles[0].subscription_tier, "free");
          }
        );
      } finally {
        unregisterMockSupabase(variant);
      }
    });
  });

  // =========================================================================
  // Feature 5 Boundaries: P0-3 INITIAL_DEMO_SESSIONS Isolation
  // =========================================================================
  describe("Feature 5 Boundaries: P0-3 INITIAL_DEMO_SESSIONS Isolation", () => {
    it("T2-F5-01: authenticated user with undefined cloudSessions resolves to []", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const hydrated = res.mod.resolveCloudHydrationState({ sessions: undefined }, "u@test.fr");
      assert.deepEqual(hydrated.history, []);
    });

    it("T2-F5-02: signed-out reset state does not expose INITIAL_DEMO_SESSIONS", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const resetState = res.mod.createSignedOutResetState();
      assert.deepEqual(resetState.history, []);
      assert.equal(resetState.settings.tier, "free");
    });

    it("T2-F5-03: resolveAuthSuccessState clears any prior demo sessions on login", async () => {
      const res = await safeImport("src/lib/auth-state.ts");
      assert.equal(res.ok, true, "src/lib/auth-state.ts must exist");
      const state = res.mod.resolveAuthSuccessState("real@test.fr");
      assert.deepEqual(state.history, []);
      assert.equal(state.history.some((s) => s.id.startsWith("demo-sess-")), false);
    });

    it("T2-F5-04: handleSignOut in page.tsx clears history state", () => {
      const pageSrc = readProjectFile("src/app/page.tsx");
      const signOutBlock = pageSrc.match(/handleSignOut[\s\S]{0,800}/)?.[0] ?? "";
      assert.match(
        signOutBlock,
        /setHistory\(\s*(\[\s*\]|reset\.history)\s*\)/,
        "handleSignOut must reset history"
      );
    });

    it("T2-F5-05: saveSessionToCloud + fetchCloudData preserves special characters in dayTitle", async () => {
      const variant = "t2-f5-05";
      const client = createMockSupabaseClient({
        profiles: [{ id: "u-1", role: "athlete" }],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        await res.mod.saveSessionToCloud("u-1", {
          id: "local-1",
          date: "2026-11-19T12:00:00Z",
          dayTitle: "Épaules & Bras — Top Set 100% <Test>",
          sets: [],
        });
        const cloud = await res.mod.fetchCloudData("u-1");
        assert.equal(cloud.sessions?.length, 1);
        assert.equal(cloud.sessions[0].dayTitle, "Épaules & Bras — Top Set 100% <Test>");
      } finally {
        unregisterMockSupabase(variant);
      }
    });
  });

  // =========================================================================
  // Feature 6 Boundaries: P1-1 Code Coach Visual Feedback & Linking
  // =========================================================================
  describe("Feature 6 Boundaries: P1-1 Code Coach", () => {
    it("T2-F6-01: linkCoachByCode rejects empty/whitespace coach code without DB update", async () => {
      const variant = "t2-f6-01";
      const client = createMockSupabaseClient({
        profiles: [{ id: "ath-1", role: "athlete", coach_id: "existing-coach" }],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.linkCoachByCode, "function");
        const r = await res.mod.linkCoachByCode("ath-1", "   ");
        assert.equal(r.ok, false);
        assert.ok(r.error && r.error.length > 0);
        assert.equal(client.__tables.profiles[0].coach_id, "existing-coach");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F6-02: linkCoachByCode returns { ok: false, error } for unknown coach code", async () => {
      const variant = "t2-f6-02";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", role: "coach", coach_code: "FAOUZI-PRO" },
          { id: "ath-1", role: "athlete", coach_id: null },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.linkCoachByCode, "function");
        const r = await res.mod.linkCoachByCode("ath-1", "UNKNOWN-CODE");
        assert.equal(r.ok, false);
        assert.ok(r.error);
        assert.equal(client.__tables.profiles[1].coach_id, null);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F6-03: linkCoachByCode handles supabase === null gracefully", async () => {
      const res = await safeImport("src/lib/supabase-sync.ts", "unconfigured-f6");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(typeof res.mod.linkCoachByCode, "function");
      const r = await res.mod.linkCoachByCode("ath-1", "FAOUZI-PRO");
      assert.equal(r.ok, false);
      assert.ok(r.error);
    });

    it("T2-F6-04: linkCoachByCode rejects SQL-injection-like input safely", async () => {
      const variant = "t2-f6-04";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", role: "coach", coach_code: "FAOUZI-PRO" },
          { id: "ath-1", role: "athlete", coach_id: null },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.linkCoachByCode, "function");
        const r = await res.mod.linkCoachByCode("ath-1", "'; DROP TABLE profiles; --");
        assert.equal(r.ok, false);
        assert.equal(client.__tables.profiles[1].coach_id, null);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F6-05: linkCoachByCode updates coach_id when switching from an old coach to a new valid coach", async () => {
      const variant = "t2-f6-05";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", display_name: "Coach A", role: "coach", coach_code: "COACH-A" },
          { id: "coach-2", display_name: "Coach B", role: "coach", coach_code: "COACH-B" },
          { id: "ath-1", role: "athlete", coach_id: "coach-1" },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.linkCoachByCode, "function");
        const r = await res.mod.linkCoachByCode("ath-1", "COACH-B");
        assert.equal(r.ok, true);
        assert.equal(client.__tables.profiles[2].coach_id, "coach-2");
      } finally {
        unregisterMockSupabase(variant);
      }
    });
  });

  // =========================================================================
  // Feature 7 Boundaries: P1-2 Supabase Sync (Custom Exercises & Split Days)
  // =========================================================================
  describe("Feature 7 Boundaries: P1-2 Supabase Sync", () => {
    it("T2-F7-01: saveCustomExercisesToCloud handles empty array [] without throwing", async () => {
      const variant = "t2-f7-01";
      const client = createMockSupabaseClient({ profiles: [{ id: "u-1" }] });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.saveCustomExercisesToCloud, "function");
        await res.mod.saveCustomExercisesToCloud("u-1", []);
        const cloud = await res.mod.fetchCloudData("u-1");
        assert.deepEqual(cloud.customExercises ?? [], []);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F7-02: saveCustomSplitDaysToCloud handles empty array [] without throwing", async () => {
      const variant = "t2-f7-02";
      const client = createMockSupabaseClient({ profiles: [{ id: "u-1" }] });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.saveCustomSplitDaysToCloud, "function");
        await res.mod.saveCustomSplitDaysToCloud("u-1", []);
        const cloud = await res.mod.fetchCloudData("u-1");
        assert.deepEqual(cloud.customSplitDays ?? [], []);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F7-03: saveCustomExercisesToCloud and saveCustomSplitDaysToCloud handle supabase === null gracefully", async () => {
      const res = await safeImport("src/lib/supabase-sync.ts", "unconfigured-f7");
      assert.equal(res.ok, true, res.error?.message);
      assert.equal(typeof res.mod.saveCustomExercisesToCloud, "function");
      assert.equal(typeof res.mod.saveCustomSplitDaysToCloud, "function");
      await res.mod.saveCustomExercisesToCloud("u-1", []);
      await res.mod.saveCustomSplitDaysToCloud("u-1", []);
    });

    it("T2-F7-04: user isolation — User A's custom exercises and split days are not returned to User B", async () => {
      const variant = "t2-f7-04";
      const client = createMockSupabaseClient({
        profiles: [{ id: "user-a" }, { id: "user-b" }],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.saveCustomExercisesToCloud, "function");
        assert.equal(typeof res.mod.saveCustomSplitDaysToCloud, "function");
        await res.mod.saveCustomExercisesToCloud("user-a", [
          { id: "ex-a", name: "User A Curl", muscleGroup: "Biceps", defaultUnit: "kg", defaultSets: [] },
        ]);
        await res.mod.saveCustomSplitDaysToCloud("user-a", [
          { dayIndex: 1, dayLabel: "Jour 1", title: "User A Day", isRest: false, exerciseIds: ["ex-a"] },
        ]);
        const cloudB = await res.mod.fetchCloudData("user-b");
        assert.deepEqual(cloudB.customExercises ?? [], []);
        assert.deepEqual(cloudB.customSplitDays ?? [], []);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F7-05: special characters and French accents round-trip cleanly in custom exercises", async () => {
      const variant = "t2-f7-05";
      const client = createMockSupabaseClient({ profiles: [{ id: "u-1" }] });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        assert.equal(typeof res.mod.saveCustomExercisesToCloud, "function");
        await res.mod.saveCustomExercisesToCloud("u-1", [
          {
            id: "ex-accent",
            name: "Développé Incliné Haltères — 30° & Élastique",
            muscleGroup: "Chest",
            defaultUnit: "kg",
            notes: "Contrôle excentrique 3s / pause 1s",
            defaultSets: [],
          },
        ]);
        const cloud = await res.mod.fetchCloudData("u-1");
        assert.equal(cloud.customExercises[0].name, "Développé Incliné Haltères — 30° & Élastique");
        assert.equal(cloud.customExercises[0].notes, "Contrôle excentrique 3s / pause 1s");
      } finally {
        unregisterMockSupabase(variant);
      }
    });
  });

  // =========================================================================
  // Feature 8 Boundaries: P1-3 Coach Check-ins History
  // =========================================================================
  describe("Feature 8 Boundaries: P1-3 Coach Check-ins History", () => {
    it("T2-F8-01: athlete with 0 check-ins returns checkIns: [] and latestCheckIn: undefined", async () => {
      const variant = "t2-f8-01";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", role: "coach" },
          { id: "ath-1", display_name: "Léo", email: "leo@test.fr", role: "athlete", coach_id: "coach-1" },
        ],
        coaching_checkins: [],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const clients = await res.mod.fetchCoachClients("coach-1");
        assert.equal(clients.length, 1);
        assert.deepEqual(clients[0].checkIns, []);
        assert.equal(clients[0].latestCheckIn, undefined);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F8-02: coach with 0 linked athletes returns []", async () => {
      const variant = "t2-f8-02";
      const client = createMockSupabaseClient({
        profiles: [{ id: "coach-1", role: "coach" }],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const clients = await res.mod.fetchCoachClients("coach-1");
        assert.deepEqual(clients, []);
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F8-03: coach isolation — check-ins of athletes linked to Coach B are excluded for Coach A", async () => {
      const variant = "t2-f8-03";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-a", role: "coach" },
          { id: "coach-b", role: "coach" },
          { id: "ath-a", display_name: "Ath A", role: "athlete", coach_id: "coach-a" },
          { id: "ath-b", display_name: "Ath B", role: "athlete", coach_id: "coach-b" },
        ],
        coaching_checkins: [
          { id: "c-a", user_id: "ath-a", full_name: "Ath A", muscle_group: "Biceps", readiness_score: 80, created_at: "2026-11-18T10:00:00Z" },
          { id: "c-b", user_id: "ath-b", full_name: "Ath B", muscle_group: "Legs", readiness_score: 50, created_at: "2026-11-18T10:00:00Z" },
        ],
      });
      registerMockSupabase(variant, client);
      try {
        const res = await safeImport("src/lib/supabase-sync.ts", variant);
        assert.equal(res.ok, true, res.error?.message);
        const clientsA = await res.mod.fetchCoachClients("coach-a");
        assert.equal(clientsA.length, 1);
        assert.equal(clientsA[0].id, "ath-a");
        assert.equal(clientsA[0].checkIns.length, 1);
        assert.equal(clientsA[0].checkIns[0].id, "c-a");
      } finally {
        unregisterMockSupabase(variant);
      }
    });

    it("T2-F8-04: fetchCoachClients handles supabase === null gracefully", async () => {
      const res = await safeImport("src/lib/supabase-sync.ts", "unconfigured-f8");
      assert.equal(res.ok, true, res.error?.message);
      const clients = await res.mod.fetchCoachClients("coach-1");
      assert.deepEqual(clients, []);
    });

    it("T2-F8-05: check-ins with optional nullable fields map cleanly without NaN or errors", async () => {
      const variant = "t2-f8-05";
      const client = createMockSupabaseClient({
        profiles: [
          { id: "coach-1", role: "coach" },
          { id: "ath-1", display_name: "Sam", role: "athlete", coach_id: "coach-1" },
        ],
        coaching_checkins: [
          {
            id: "c-min",
            user_id: "ath-1",
            full_name: "Sam",
            muscle_group: "Dos",
            caffeine_time: null,
            intensity: null,
            negative_factors: null,
            readiness_score: 72,
            created_at: "2026-11-19T07:00:00Z",
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
        assert.equal(chk.caffeineTime, undefined);
        assert.equal(chk.intensity, undefined);
        assert.equal(chk.negativeFactors, undefined);
        assert.equal(chk.readinessScore, 72);
      } finally {
        unregisterMockSupabase(variant);
      }
    });
  });
});
