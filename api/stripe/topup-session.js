const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function getAuthenticatedUser(req) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
  const authHeader = req.headers.authorization || "";

  if (!supabaseUrl || !supabaseAnon || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, supabaseAnon);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
  if (!stripeSecret) {
    return json(res, 500, { error: "STRIPE_SECRET_KEY is not configured" });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return json(res, 401, { error: "Unauthorized" });
  }

  const body = req.body || {};
  const amount = Number(body.amount);
  const currency = String(body.currency || "USD").toLowerCase();
  const method = body.method === "bank" ? "bank" : "card";

  if (!Number.isFinite(amount) || amount < 1 || amount > 50000) {
    return json(res, 400, { error: "Invalid amount" });
  }

  const supportedCurrency = currency === "usd" ? "usd" : "usd";
  const amountCents = Math.round(amount * 100);

  const appUrl =
    process.env.EXPO_PUBLIC_APP_URL ||
    req.headers.origin ||
    "https://allgood-kappa.vercel.app";

  const stripe = new Stripe(stripeSecret);

  try {
    const paymentMethodTypes = method === "bank" ? ["us_bank_account"] : ["card"];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: supportedCurrency,
            unit_amount: amountCents,
            product_data: {
              name: "AllGood Wallet Top-up",
              description: method === "bank" ? "Bank account funding" : "Card funding",
            },
          },
        },
      ],
      success_url: `${appUrl}/deposit?topup=success`,
      cancel_url: `${appUrl}/deposit?topup=cancel`,
      metadata: {
        user_id: user.id,
        method,
        source: "allgood_checkout_topup",
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          method,
          source: "allgood_checkout_topup",
        },
      },
    });

    return json(res, 200, { id: session.id, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session";
    return json(res, 500, { error: message });
  }
};
