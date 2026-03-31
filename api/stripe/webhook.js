const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !supabaseServiceRole) {
    return json(res, 500, { error: "Stripe/Supabase server env vars are not configured" });
  }

  const stripe = new Stripe(stripeSecret);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return json(res, 400, { error: message });
  }

  if (event.type !== "checkout.session.completed") {
    await supabaseAdmin.from("webhook_events").upsert(
      {
        provider: "stripe",
        event_id: event.id,
        event_type: event.type,
        status: "processed",
        payload: event,
        processed_at: new Date().toISOString(),
      },
      { onConflict: "provider,event_id" },
    );
    return json(res, 200, { received: true });
  }

  const { error: lockErr } = await supabaseAdmin.from("webhook_events").insert({
    provider: "stripe",
    event_id: event.id,
    event_type: event.type,
    status: "processing",
    payload: event,
  });

  if (lockErr) {
    if (lockErr.code === "23505") {
      return json(res, 200, { received: true, deduplicated: true });
    }
    return json(res, 500, { error: lockErr.message });
  }

  const session = event.data.object;
  const userId = session?.metadata?.user_id;
  const method = session?.metadata?.method || "card";
  const amount = Number(session?.amount_total || 0) / 100;
  const currency = String(session?.currency || "usd").toUpperCase();

  if (!userId || amount <= 0) {
    await supabaseAdmin
      .from("webhook_events")
      .update({
        status: "failed",
        error_message: "Missing user_id or amount in checkout session",
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "stripe")
      .eq("event_id", event.id);

    return json(res, 400, { error: "Missing user_id or amount in checkout session" });
  }

  const note = `stripe_topup:${session.id}:${method}`;

  const { data: existingTx } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("note", note)
    .maybeSingle();

  if (existingTx?.id) {
    await supabaseAdmin
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("provider", "stripe")
      .eq("event_id", event.id);

    return json(res, 200, { received: true, deduplicated: true });
  }

  const { error: addErr } = await supabaseAdmin.rpc("add_balance", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (addErr) {
    await supabaseAdmin
      .from("webhook_events")
      .update({
        status: "failed",
        error_message: addErr.message,
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "stripe")
      .eq("event_id", event.id);

    return json(res, 500, { error: addErr.message });
  }

  const { error: txErr } = await supabaseAdmin.from("transactions").insert({
    sender_id: userId,
    recipient_id: userId,
    recipient_name: "Stripe Top-up",
    amount,
    currency,
    fee: 0,
    status: "completed",
    type: "receive",
    note,
    completed_at: new Date().toISOString(),
  });

  if (txErr) {
    await supabaseAdmin
      .from("webhook_events")
      .update({
        status: "failed",
        error_message: txErr.message,
        processed_at: new Date().toISOString(),
      })
      .eq("provider", "stripe")
      .eq("event_id", event.id);

    return json(res, 500, { error: txErr.message });
  }

  await supabaseAdmin.from("funding_audit_events").insert({
    user_id: userId,
    provider: "stripe",
    event_type: event.type,
    external_ref: session.id,
    amount,
    currency,
    status: "succeeded",
    metadata: {
      method,
      payment_intent: session.payment_intent || null,
      mode: session.mode || null,
    },
  });

  await supabaseAdmin
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("provider", "stripe")
    .eq("event_id", event.id);

  return json(res, 200, { received: true });
};
