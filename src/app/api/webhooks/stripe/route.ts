import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || serviceKey.includes("...")) {
    return NextResponse.json(
      { error: "Supabase service role non configuré." },
      { status: 500 }
    );
  }

  try {
    const event = await req.json();
    const admin = createClient(supabaseUrl, serviceKey);

    if (event.type === "checkout.session.completed") {
      const email = event.data?.object?.customer_email as string | undefined;
      const customerId = event.data?.object?.customer as string | undefined;
      const subscriptionId = event.data?.object?.subscription as
        | string
        | undefined;

      if (email) {
        await admin
          .from("profiles")
          .update({
            subscription_tier: "pro",
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("email", email);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const customerId = event.data?.object?.customer as string | undefined;
      if (customerId) {
        await admin
          .from("profiles")
          .update({
            subscription_tier: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur traitement webhook Stripe" },
      { status: 400 }
    );
  }
}
