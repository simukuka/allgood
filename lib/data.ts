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
    })
    .select("*")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as BankAccount, error: null };
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
