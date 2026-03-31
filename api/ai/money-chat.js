const { createClient } = require("@supabase/supabase-js");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function monthStartIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getAuthenticatedClient(req) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
  const authHeader = req.headers.authorization || "";

  if (!supabaseUrl || !supabaseAnon || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { supabase, user: data.user };
}

function buildHeuristicAnswer(message, money) {
  const q = String(message || "").toLowerCase();
  const net = money.monthly.received - money.monthly.sent;
  const topExpense = money.expenses[0];

  if (/budget|spend|expense/.test(q)) {
    if (!topExpense) {
      return "You do not have enough completed transactions this month for a spending breakdown yet. Make a transfer or deposit and I will categorize your budget automatically.";
    }
    return `This month you sent $${money.monthly.sent.toFixed(2)} and received $${money.monthly.received.toFixed(2)}. Your top expense section is ${topExpense.label} at ${topExpense.percent.toFixed(0)}% ($${topExpense.amount.toFixed(2)}).`;
  }

  if (/save|saving|goal|emergency/.test(q)) {
    if (net >= 0) {
      return `You are cash-flow positive by $${net.toFixed(2)} this month. A practical next step is auto-saving 20% of that (${(net * 0.2).toFixed(2)}) into your emergency fund.`;
    }
    return `You are currently cash-flow negative by $${Math.abs(net).toFixed(2)} this month. Reduce spending in your top section first${topExpense ? ` (${topExpense.label})` : ""} to move back to positive.`;
  }

  if (/passport|credit|country|abroad|international/.test(q)) {
    return `Your Financial Passport is active with score ${money.passport.score} (${money.passport.band}). Keep completed transfers high and failed transfers low to improve recognition across partner countries.`;
  }

  if (/balance|how much/.test(q)) {
    return `Your current available balance is ${money.balance.currency} ${money.balance.amount.toFixed(2)}. This month: sent $${money.monthly.sent.toFixed(2)}, received $${money.monthly.received.toFixed(2)}.`;
  }

  return `Here is your current money snapshot: balance ${money.balance.currency} ${money.balance.amount.toFixed(2)}, monthly net ${net >= 0 ? "+" : "-"}$${Math.abs(net).toFixed(2)}, completed transfers ${money.monthly.completedTransfers}. Ask me about budget, savings, remittances, or your Financial Passport score.`;
}

async function maybeCallOpenAI(message, money) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const prompt = [
    "You are AllGood Money Coach.",
    "Use ONLY provided user money context.",
    "Be concise, practical, and numeric.",
    "If data is missing, say so and suggest next action.",
    "Never invent balances or transactions.",
    "",
    `Money context: ${JSON.stringify(money)}`,
    `User question: ${message}`,
  ].join("\n");

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.2,
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const out = data?.output_text;
    return typeof out === "string" && out.trim() ? out.trim() : null;
  } catch {
    return null;
  }
}

function computePassportScore({ accountAgeMonths, completedTxCount, totalTxCount, balance }) {
  let score = 580;
  score += Math.min(80, (accountAgeMonths / 24) * 80);
  const paymentRatio = totalTxCount > 0 ? completedTxCount / totalTxCount : 0;
  score += Math.round(paymentRatio * 100);
  score += Math.min(60, (completedTxCount / 20) * 60);
  score += Math.min(30, (balance / 100) * 30);
  score = Math.min(850, Math.round(score));

  let band = "Excellent";
  if (score < 580) band = "Poor";
  else if (score < 670) band = "Fair";
  else if (score < 740) band = "Good";

  return { score, band };
}

function classifyExpense(note, recipientName) {
  const text = `${note || ""} ${recipientName || ""}`.toLowerCase();
  if (/rent|utility|bill|electric|water|internet/.test(text)) return "Housing & Bills";
  if (/food|restaurant|dining|grocery|meal/.test(text)) return "Food & Dining";
  if (/uber|lyft|taxi|bus|fuel|transport/.test(text)) return "Transport";
  if (/remit|family|home/.test(text)) return "Remittances";
  if (/shop|market|store|amazon/.test(text)) return "Shopping";
  if (/fee|charge/.test(text)) return "Fees";
  return "Other";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const auth = await getAuthenticatedClient(req);
  if (!auth) {
    return json(res, 401, { error: "Unauthorized" });
  }

  const { supabase, user } = auth;

  if (req.method === "GET") {
    const { data: historyRows, error: historyErr } = await supabase
      .from("ai_chat_messages")
      .select("id,role,message,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(30);

    if (historyErr) {
      return json(res, 200, { messages: [] });
    }

    return json(res, 200, {
      messages: (historyRows || []).map((row) => ({
        id: row.id,
        role: row.role,
        text: row.message,
        createdAt: row.created_at,
      })),
    });
  }

  const message = String(req.body?.message || "").trim();
  if (!message) {
    return json(res, 400, { error: "Message is required" });
  }

  const [{ data: profile }, { data: account }, { data: txs }] = await Promise.all([
    supabase.from("profiles").select("full_name,created_at,passport_number").eq("id", user.id).maybeSingle(),
    supabase.from("accounts").select("balance,currency").eq("user_id", user.id).eq("account_type", "checking").maybeSingle(),
    supabase
      .from("transactions")
      .select("amount,sender_id,recipient_name,note,status,created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .gte("created_at", monthStartIso())
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const rows = txs || [];
  const completed = rows.filter((t) => t.status === "completed");

  let sent = 0;
  let received = 0;
  const expenseBuckets = {};

  completed.forEach((tx) => {
    const amount = Number(tx.amount || 0);
    if (tx.sender_id === user.id) {
      sent += amount;
      const key = classifyExpense(tx.note, tx.recipient_name);
      expenseBuckets[key] = (expenseBuckets[key] || 0) + amount;
    } else {
      received += amount;
    }
  });

  const expenseTotal = Object.values(expenseBuckets).reduce((a, b) => a + b, 0);
  const expenses = Object.entries(expenseBuckets)
    .map(([label, amount]) => ({
      label,
      amount,
      percent: expenseTotal > 0 ? (Number(amount) / expenseTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const memberSince = profile?.created_at ? new Date(profile.created_at) : new Date();
  const now = new Date();
  const accountAgeMonths = Math.max(
    0,
    (now.getFullYear() - memberSince.getFullYear()) * 12 +
      (now.getMonth() - memberSince.getMonth()),
  );

  const passport = computePassportScore({
    accountAgeMonths,
    completedTxCount: completed.length,
    totalTxCount: rows.length,
    balance: Number(account?.balance || 0),
  });

  const money = {
    user: {
      id: user.id,
      name: profile?.full_name || "Member",
    },
    balance: {
      amount: Number(account?.balance || 0),
      currency: String(account?.currency || "USD"),
    },
    monthly: {
      sent,
      received,
      completedTransfers: completed.length,
      txCount: rows.length,
    },
    expenses,
    passport: {
      number: profile?.passport_number || null,
      score: passport.score,
      band: passport.band,
    },
  };

  const { data: previousRows } = await supabase
    .from("ai_chat_messages")
    .select("role,message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const chatHistory = (previousRows || []).reverse().map((row) => `${row.role}: ${row.message}`);

  const aiText = await maybeCallOpenAI(`${chatHistory.join("\n")}\nuser: ${message}`.trim(), money);
  const answer = aiText || buildHeuristicAnswer(message, money);

  // Save conversation turns. If the table is not yet migrated, continue gracefully.
  try {
    await supabase.from("ai_chat_messages").insert([
      {
        user_id: user.id,
        role: "user",
        message,
      },
      {
        user_id: user.id,
        role: "assistant",
        message: answer,
      },
    ]);
  } catch {
    // ignore persistence failures and still return live response
  }

  return json(res, 200, {
    reply: answer,
    context: {
      balance: money.balance,
      monthly: money.monthly,
      topExpense: expenses[0] || null,
      passport: money.passport,
    },
  });
};
