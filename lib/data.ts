import type {
    Account,
  BankAccount,
    Contact,
    ScheduledTransfer,
    Transaction,
} from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

// ─── Accounts ────────────────────────────────────────────────

export async function getAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("getAccounts error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getPrimaryBalance(
  userId: string,
): Promise<{ balance: number; currency: string }> {
  const { data, error } = await supabase
    .from("accounts")
    .select("balance, currency")
    .eq("user_id", userId)
    .eq("account_type", "checking")
    .single();

  if (error || !data) return { balance: 0, currency: "USD" };
  return { balance: data.balance, currency: data.currency };
}

// ─── Transactions ────────────────────────────────────────────

export async function getRecentTransactions(
  userId: string,
  limit = 10,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("getRecentTransactions error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function createTransaction(
  tx: Omit<Transaction, "id" | "created_at" | "completed_at">,
): Promise<{ data: Transaction | null; error: string | null }> {
  const { data, error } = await supabase
    .from("transactions")
    .insert(tx)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Update sender's balance (deduct amount + fee)
  if (data) {
    const totalDeducted = data.amount + data.fee;
    const { error: balErr } = await supabase.rpc("deduct_balance", {
      p_user_id: data.sender_id,
      p_amount: totalDeducted,
    });
    if (balErr) {
      console.warn("Balance deduction failed:", balErr.message);
      // Fallback: manual update
      const { data: account } = await supabase
        .from("accounts")
        .select("balance")
        .eq("user_id", data.sender_id)
        .eq("account_type", "checking")
        .single();

      if (account) {
        await supabase
          .from("accounts")
          .update({ balance: account.balance - totalDeducted })
          .eq("user_id", data.sender_id)
          .eq("account_type", "checking");
      }
    }
  }

  return { data: data as Transaction, error: null };
}

export async function createMoneyRequest(input: {
  payerUserId: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail?: string | null;
  amount: number;
  currency?: string;
  note?: string;
}): Promise<{ data: Transaction | null; error: string | null }> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      sender_id: input.payerUserId,
      recipient_id: input.requesterUserId,
      recipient_email: input.requesterEmail || null,
      recipient_phone: null,
      recipient_name: input.requesterName,
      amount: input.amount,
      currency: input.currency || "USD",
      converted_amount: null,
      converted_currency: null,
      exchange_rate: null,
      fee: 0,
      status: "pending",
      type: "request",
      note: input.note || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Transaction, error: null };
}

export async function updateTransactionStatus(
  transactionId: string,
  status: Transaction["status"],
): Promise<{ error: string | null }> {
  const payload: Partial<Transaction> = {
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("id", transactionId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function addFundsToChecking(
  userId: string,
  amount: number,
): Promise<{ error: string | null }> {
  const { error: rpcErr } = await supabase.rpc("add_balance", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (!rpcErr) return { error: null };

  const { data: account, error: fetchErr } = await supabase
    .from("accounts")
    .select("balance")
    .eq("user_id", userId)
    .eq("account_type", "checking")
    .single();

  if (fetchErr || !account) {
    return { error: rpcErr.message };
  }

  const { error: updateErr } = await supabase
    .from("accounts")
    .update({
      balance: account.balance + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("account_type", "checking");

  return { error: updateErr?.message ?? null };
}

export async function getBankAccounts(userId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("getBankAccounts error:", error.message);
    return [];
  }

  return (data ?? []) as BankAccount[];
}

export async function linkBankAccount(input: {
  userId: string;
  bankName: string;
  accountHolder: string;
  accountLast4: string;
  routingLast4?: string;
  currency?: string;
  availableBalance?: number;
}): Promise<{ data: BankAccount | null; error: string | null }> {
  const { count } = await supabase
    .from("bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId);

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      user_id: input.userId,
      bank_name: input.bankName,
      account_holder: input.accountHolder,
      account_last4: input.accountLast4,
      routing_last4: input.routingLast4 || null,
      currency: input.currency || "USD",
      available_balance: input.availableBalance ?? 0,
      is_verified: true,
      is_default: !count || count === 0,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as BankAccount, error: null };
}

export async function setDefaultBankAccount(
  userId: string,
  bankAccountId: string,
): Promise<{ error: string | null }> {
  const { error: resetErr } = await supabase
    .from("bank_accounts")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (resetErr) return { error: resetErr.message };

  const { error: setErr } = await supabase
    .from("bank_accounts")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", bankAccountId)
    .eq("user_id", userId);

  if (setErr) return { error: setErr.message };
  return { error: null };
}

export async function removeBankAccount(
  userId: string,
  bankAccountId: string,
): Promise<{ error: string | null }> {
  const { data: target, error: targetErr } = await supabase
    .from("bank_accounts")
    .select("id,is_default")
    .eq("id", bankAccountId)
    .eq("user_id", userId)
    .single();

  if (targetErr || !target) return { error: targetErr?.message || "Bank account not found." };

  const { error: deleteErr } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", bankAccountId)
    .eq("user_id", userId);

  if (deleteErr) return { error: deleteErr.message };

  if (target.is_default) {
    const { data: remaining } = await supabase
      .from("bank_accounts")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    const fallback = remaining?.[0]?.id;
    if (fallback) {
      await supabase
        .from("bank_accounts")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", fallback)
        .eq("user_id", userId);
    }
  }

  return { error: null };
}

export async function fundWalletFromBankAccount(input: {
  userId: string;
  bankAccountId: string;
  amount: number;
  note?: string;
}): Promise<{ error: string | null }> {
  const { data: bankAccount, error: bankErr } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("id", input.bankAccountId)
    .eq("user_id", input.userId)
    .single();

  if (bankErr || !bankAccount) {
    return { error: bankErr?.message || "Bank account not found." };
  }

  if (bankAccount.available_balance < input.amount) {
    return { error: "Insufficient linked bank balance." };
  }

  const { error: debitBankErr } = await supabase
    .from("bank_accounts")
    .update({
      available_balance: bankAccount.available_balance - input.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bankAccountId)
    .eq("user_id", input.userId);

  if (debitBankErr) return { error: debitBankErr.message };

  const { error: addErr } = await addFundsToChecking(input.userId, input.amount);
  if (addErr) return { error: addErr };

  await supabase.from("bank_transfers").insert({
    user_id: input.userId,
    bank_account_id: input.bankAccountId,
    amount: input.amount,
    currency: bankAccount.currency || "USD",
    direction: "inbound",
    status: "completed",
    note: input.note || `deposit:bank:last4=${bankAccount.account_last4}`,
    completed_at: new Date().toISOString(),
  });

  await supabase.from("transactions").insert({
    sender_id: input.userId,
    recipient_id: input.userId,
    recipient_name: "Bank Deposit",
    amount: input.amount,
    currency: bankAccount.currency || "USD",
    fee: 0,
    status: "completed",
    type: "receive",
    note: input.note || `deposit:bank:last4=${bankAccount.account_last4}`,
    completed_at: new Date().toISOString(),
  });

  await supabase.from("funding_audit_events").insert({
    user_id: input.userId,
    provider: "internal_bank",
    event_type: "wallet_funded",
    external_ref: `bank_account:${input.bankAccountId}`,
    amount: input.amount,
    currency: bankAccount.currency || "USD",
    status: "succeeded",
    metadata: {
      note: input.note || null,
      account_last4: bankAccount.account_last4,
    },
  });

  return { error: null };
}

export async function appendTransactionNote(
  transactionId: string,
  noteLine: string,
): Promise<{ error: string | null }> {
  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("note")
    .eq("id", transactionId)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  const currentNote = tx?.note?.trim() || "";
  const nextNote = currentNote ? `${currentNote}\n${noteLine}` : noteLine;

  const { error: updateErr } = await supabase
    .from("transactions")
    .update({ note: nextNote })
    .eq("id", transactionId);

  return { error: updateErr?.message ?? null };
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Transaction;
}

// ─── Contacts ────────────────────────────────────────────────

export async function getContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("last_sent_at", { ascending: false });

  if (error) {
    console.warn("getContacts error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getRecentContacts(
  userId: string,
  limit = 5,
): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .not("last_sent_at", "is", null)
    .order("last_sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("getRecentContacts error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function upsertContact(
  contact: Omit<Contact, "id" | "created_at">,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("contacts").upsert(contact, {
    onConflict: "user_id,contact_email",
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function getTrustedContacts(userId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_favorite", true)
    .order("last_sent_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.warn("getTrustedContacts error:", error.message);
    return [];
  }

  return data ?? [];
}

export async function setContactTrusted(
  userId: string,
  contactId: string,
  trusted: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("contacts")
    .update({ is_favorite: trusted })
    .eq("id", contactId)
    .eq("user_id", userId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function ensureTrustedContact(input: {
  userId: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  countryCode?: string | null;
  flagEmoji?: string | null;
}): Promise<{ error: string | null }> {
  if (input.contactEmail) {
    const { error } = await supabase.from("contacts").upsert(
      {
        user_id: input.userId,
        contact_name: input.contactName,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone || null,
        country_code: input.countryCode || null,
        flag_emoji: input.flagEmoji || null,
        is_favorite: true,
      },
      { onConflict: "user_id,contact_email" },
    );
    if (error) return { error: error.message };
    return { error: null };
  }

  const { data: existing, error: existingErr } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", input.userId)
    .eq("contact_phone", input.contactPhone || "")
    .maybeSingle();

  if (existingErr) return { error: existingErr.message };

  if (existing?.id) {
    const { error } = await supabase
      .from("contacts")
      .update({
        contact_name: input.contactName,
        country_code: input.countryCode || null,
        flag_emoji: input.flagEmoji || null,
        is_favorite: true,
      })
      .eq("id", existing.id)
      .eq("user_id", input.userId);

    if (error) return { error: error.message };
    return { error: null };
  }

  const { error } = await supabase.from("contacts").insert({
    user_id: input.userId,
    contact_name: input.contactName,
    contact_email: null,
    contact_phone: input.contactPhone || null,
    country_code: input.countryCode || null,
    flag_emoji: input.flagEmoji || null,
    is_favorite: true,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function recordRecentContact(input: {
  userId: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}): Promise<void> {
  if (!input.contactEmail && !input.contactPhone) return;

  const findByColumn = input.contactEmail ? "contact_email" : "contact_phone";
  const findValue = input.contactEmail || input.contactPhone;

  const { data: existing } = await supabase
    .from("contacts")
    .select("id,is_favorite")
    .eq("user_id", input.userId)
    .eq(findByColumn, findValue as string)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("contacts")
      .update({
        contact_name: input.contactName,
        last_sent_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", input.userId);
    return;
  }

  if (input.contactEmail) {
    await supabase.from("contacts").upsert(
      {
        user_id: input.userId,
        contact_name: input.contactName,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone || null,
        is_favorite: false,
        last_sent_at: new Date().toISOString(),
      },
      { onConflict: "user_id,contact_email" },
    );
    return;
  }

  await supabase.from("contacts").insert({
    user_id: input.userId,
    contact_name: input.contactName,
    contact_email: null,
    contact_phone: input.contactPhone || null,
    is_favorite: false,
    last_sent_at: new Date().toISOString(),
  });
}

export async function isTrustedRecipient(input: {
  userId: string;
  method: "email" | "phone" | "wallet";
  recipient: string;
}): Promise<boolean> {
  if (input.method === "wallet") return false;

  const column = input.method === "email" ? "contact_email" : "contact_phone";
  const { data, error } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", input.userId)
    .eq("is_favorite", true)
    .eq(column, input.recipient)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}

export interface BudgetSection {
  key: string;
  label: string;
  amount: number;
  percent: number;
}

export interface MoneyInsight {
  title: string;
  detail: string;
  level: "good" | "warn" | "info";
}

const EXPENSE_LABELS: Record<string, string> = {
  housing: "Housing & Bills",
  food: "Food & Dining",
  transport: "Transport",
  remittance: "Remittances",
  shopping: "Shopping",
  fees: "Fees",
  other: "Other",
};

const INCOME_LABELS: Record<string, string> = {
  salary: "Salary",
  refund: "Refunds",
  transfer_in: "Incoming transfers",
  deposit: "Deposits",
  other: "Other income",
};

function classifyExpense(note: string, recipientName: string): keyof typeof EXPENSE_LABELS {
  const text = `${note} ${recipientName}`.toLowerCase();
  if (/rent|utility|bill|electric|water|internet/.test(text)) return "housing";
  if (/food|restaurant|dining|grocery|meal/.test(text)) return "food";
  if (/uber|lyft|taxi|bus|fuel|transport/.test(text)) return "transport";
  if (/remit|family|home/.test(text)) return "remittance";
  if (/shop|market|store|amazon/.test(text)) return "shopping";
  if (/fee|charge/.test(text)) return "fees";
  return "other";
}

function classifyIncome(note: string, recipientName: string): keyof typeof INCOME_LABELS {
  const text = `${note} ${recipientName}`.toLowerCase();
  if (/salary|payroll|wage|employer/.test(text)) return "salary";
  if (/refund|reversal/.test(text)) return "refund";
  if (/deposit|topup|stripe/.test(text)) return "deposit";
  if (/transfer|payment/.test(text)) return "transfer_in";
  return "other";
}

function mapSections(
  totals: Record<string, number>,
  totalAmount: number,
  labels: Record<string, string>,
): BudgetSection[] {
  return Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, amount]) => ({
      key,
      label: labels[key] || key,
      amount,
      percent: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
    }));
}

export async function getMonthlyBudgetSections(userId: string): Promise<{
  incomeTotal: number;
  expenseTotal: number;
  incomeSections: BudgetSection[];
  expenseSections: BudgetSection[];
  insights: MoneyInsight[];
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount,sender_id,recipient_name,note,status")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .gte("created_at", startOfMonth.toISOString())
    .eq("status", "completed");

  if (error || !data) {
    return {
      incomeTotal: 0,
      expenseTotal: 0,
      incomeSections: [],
      expenseSections: [],
      insights: [],
    };
  }

  const incomeBuckets: Record<string, number> = {};
  const expenseBuckets: Record<string, number> = {};
  let incomeTotal = 0;
  let expenseTotal = 0;

  data.forEach((tx) => {
    const amount = Number(tx.amount || 0);
    const note = String(tx.note || "");
    const recipientName = String(tx.recipient_name || "");

    if (tx.sender_id === userId) {
      const bucket = classifyExpense(note, recipientName);
      expenseBuckets[bucket] = (expenseBuckets[bucket] || 0) + amount;
      expenseTotal += amount;
    } else {
      const bucket = classifyIncome(note, recipientName);
      incomeBuckets[bucket] = (incomeBuckets[bucket] || 0) + amount;
      incomeTotal += amount;
    }
  });

  const incomeSections = mapSections(incomeBuckets, incomeTotal, INCOME_LABELS);
  const expenseSections = mapSections(expenseBuckets, expenseTotal, EXPENSE_LABELS);

  const net = incomeTotal - expenseTotal;
  const remittanceSpend = expenseBuckets.remittance || 0;
  const topExpense = expenseSections[0];

  const insights: MoneyInsight[] = [];

  if (incomeTotal === 0 && expenseTotal === 0) {
    insights.push({
      title: "No activity yet",
      detail: "Start with your first transfer or deposit to unlock personalized money insights.",
      level: "info",
    });
  } else {
    insights.push(
      net >= 0
        ? {
            title: "Positive cash flow",
            detail: `You are up $${net.toFixed(2)} this month. Keep this pace to build your emergency fund.`,
            level: "good",
          }
        : {
            title: "Spending exceeds inflow",
            detail: `You are down $${Math.abs(net).toFixed(2)} this month. Consider lowering your top category spend.`,
            level: "warn",
          },
    );

    if (topExpense) {
      insights.push({
        title: `Top spend: ${topExpense.label}`,
        detail: `${topExpense.percent.toFixed(0)}% of your outgoing money is in ${topExpense.label.toLowerCase()}.`,
        level: "info",
      });
    }

    if (remittanceSpend > 0) {
      insights.push({
        title: "Family support tracked",
        detail: `You sent $${remittanceSpend.toFixed(2)} in remittances this month. This helps your Financial Passport history.`,
        level: "good",
      });
    }
  }

  return {
    incomeTotal,
    expenseTotal,
    incomeSections,
    expenseSections,
    insights: insights.slice(0, 3),
  };
}

// ─── Scheduled Transfers ─────────────────────────────────────

export async function getScheduledTransfers(
  userId: string,
): Promise<ScheduledTransfer[]> {
  const { data, error } = await supabase
    .from("scheduled_transfers")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("next_date", { ascending: true });

  if (error) {
    console.warn("getScheduledTransfers error:", error.message);
    return [];
  }
  return data ?? [];
}

// ─── Statistics ──────────────────────────────────────────────

export async function getMonthlyStats(userId: string): Promise<{
  totalSent: number;
  totalReceived: number;
  transferCount: number;
  avgTransfer: number;
}> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, sender_id, status")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .gte("created_at", startOfMonth.toISOString());

  if (error || !data) return { totalSent: 0, totalReceived: 0, transferCount: 0, avgTransfer: 0 };

  let totalSent = 0;
  let totalReceived = 0;
  let sentCount = 0;

  data.forEach((tx) => {
    if (tx.sender_id === userId) {
      totalSent += tx.amount;
      sentCount++;
    } else {
      totalReceived += tx.amount;
    }
  });

  return {
    totalSent,
    totalReceived,
    transferCount: sentCount,
    avgTransfer: sentCount > 0 ? totalSent / sentCount : 0,
  };
}

// ─── Notifications (derived from transactions) ────────────────

export interface AppNotification {
  id: string;
  type: "transfer_sent" | "transfer_received" | "transfer_failed" | "transfer_pending" | "deposit";
  title: string;
  description: string;
  amount: number;
  currency: string;
  time: string;
  read: boolean;
  transactionId: string;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return data.map((tx): AppNotification => {
    const isSender     = tx.sender_id === userId;
    const isDeposit    = tx.type === "receive" && tx.recipient_id === tx.sender_id;
    const name         = tx.recipient_name || "Someone";
    const amt          = tx.amount as number;
    const cur          = (tx.currency as string) || "USD";
    const createdAt    = new Date(tx.created_at as string);
    const now          = new Date();
    const diffMs       = now.getTime() - createdAt.getTime();
    const diffMin      = Math.floor(diffMs / 60000);
    const diffH        = Math.floor(diffMin / 60);
    const diffD        = Math.floor(diffH / 24);
    const timeStr =
      diffMin < 1   ? "just now"
      : diffMin < 60 ? `${diffMin}m ago`
      : diffH < 24   ? `${diffH}h ago`
      : diffD < 7    ? `${diffD}d ago`
      : createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (isDeposit) {
      return {
        id: tx.id as string,
        type: "deposit",
        title: "Funds added",
        description: `$${(amt).toFixed(2)} was added to your account.`,
        amount: amt,
        currency: cur,
        time: timeStr,
        read: diffD >= 1,
        transactionId: tx.id as string,
      };
    }
    if (isSender && tx.status === "completed") {
      return {
        id: tx.id as string,
        type: "transfer_sent",
        title: `Transfer to ${name} confirmed`,
        description: `$${amt.toFixed(2)} arrived. $${((tx.fee as number) || 0).toFixed(2)} fee.`,
        amount: amt,
        currency: cur,
        time: timeStr,
        read: diffH >= 1,
        transactionId: tx.id as string,
      };
    }
    if (isSender && tx.status === "pending") {
      return {
        id: tx.id as string,
        type: "transfer_pending",
        title: `Transfer to ${name} processing`,
        description: `$${amt.toFixed(2)} is on its way.`,
        amount: amt,
        currency: cur,
        time: timeStr,
        read: false,
        transactionId: tx.id as string,
      };
    }
    if (isSender && tx.status === "failed") {
      return {
        id: tx.id as string,
        type: "transfer_failed",
        title: `Transfer to ${name} failed`,
        description: `$${amt.toFixed(2)} was not sent. Funds returned.`,
        amount: amt,
        currency: cur,
        time: timeStr,
        read: false,
        transactionId: tx.id as string,
      };
    }
    // Recipient received money
    return {
      id: tx.id as string,
      type: "transfer_received",
      title: `You received $${amt.toFixed(2)}`,
      description: `From ${name}.`,
      amount: amt,
      currency: cur,
      time: timeStr,
      read: diffH >= 1,
      transactionId: tx.id as string,
    };
  });
}

export async function getMonthlyChange(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, sender_id")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .gte("created_at", startOfMonth.toISOString())
    .eq("status", "completed");

  if (error || !data) return 0;

  return data.reduce((sum, tx) => {
    if (tx.sender_id === userId) {
      return sum - tx.amount;
    }
    return sum + tx.amount;
  }, 0);
}
