import { supabase } from "@/integrations/supabase/client";
import type { Expense } from "@/types/expense";

export async function getExpenses(groupId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select(`
      *,
      payer:members!expenses_paid_by_fkey(id, name, avatar_color),
      splits:expense_splits(
        *,
        member:members(id, name, avatar_color)
      )
    `)
    .eq("group_id", groupId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecentExpenses(groupId: string, limit: number = 5): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select(`
      *,
      payer:members!expenses_paid_by_fkey(id, name, avatar_color),
      splits:expense_splits(
        *,
        member:members(id, name, avatar_color)
      )
    `)
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getExpense(id: string): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .select(`
      *,
      payer:members!expenses_paid_by_fkey(id, name, avatar_color),
      splits:expense_splits(
        *,
        member:members(id, name, avatar_color)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

interface CreateExpenseInput {
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  converted_amount?: number | null;
  base_currency?: string | null;
  exchange_rate?: number | null;
  paid_by: string;
  date: string;
  photo_url?: string | null;
  category?: string | null;
  notes?: string | null;
}

interface CreateSplitInput {
  member_id: string;
  amount: number;
  percentage: number;
}

export async function createExpense(
  expense: CreateExpenseInput,
  splits: CreateSplitInput[]
): Promise<Expense> {
  const { data: expenseData, error: expenseError } = await supabase
    .from("expenses")
    .insert(expense)
    .select()
    .single();

  if (expenseError) throw expenseError;

  const splitsWithExpenseId = splits.map((s) => ({
    ...s,
    expense_id: expenseData.id,
  }));

  const { error: splitsError } = await supabase
    .from("expense_splits")
    .insert(splitsWithExpenseId);

  if (splitsError) throw splitsError;

  return getExpense(expenseData.id);
}

export async function updateExpense(
  id: string,
  expense: Partial<CreateExpenseInput>,
  splits?: CreateSplitInput[]
): Promise<Expense> {
  const { error: expenseError } = await supabase
    .from("expenses")
    .update(expense)
    .eq("id", id);

  if (expenseError) throw expenseError;

  if (splits) {
    // Delete old splits and insert new ones
    await supabase.from("expense_splits").delete().eq("expense_id", id);

    const splitsWithExpenseId = splits.map((s) => ({
      ...s,
      expense_id: id,
    }));

    const { error: splitsError } = await supabase
      .from("expense_splits")
      .insert(splitsWithExpenseId);

    if (splitsError) throw splitsError;
  }

  return getExpense(id);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadPhoto(
  groupId: string,
  expenseId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${groupId}/${expenseId}.${ext}`;

  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("receipts")
    .getPublicUrl(path);

  return data.publicUrl;
}

// Calculate balances for all members
export function calculateBalances(
  expenses: Expense[]
): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const amount = expense.converted_amount ?? expense.amount;

    // Credit the payer
    if (!balances[expense.paid_by]) balances[expense.paid_by] = 0;
    balances[expense.paid_by] += amount;

    // Debit each participant
    for (const split of expense.splits ?? []) {
      if (!balances[split.member_id]) balances[split.member_id] = 0;
      balances[split.member_id] -= split.amount;
    }
  }

  return balances;
}

// Calculate simplified debts (who owes whom)
export function simplifyDebts(
  balances: Record<string, number>
): Array<{ from: string; to: string; amount: number }> {
  const debtors: Array<{ id: string; amount: number }> = [];
  const creditors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of Object.entries(balances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ id, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ id, amount: rounded });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: Array<{ from: string; to: string; amount: number }> = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(debtors[i].amount, creditors[j].amount);
    if (payment > 0.01) {
      debts.push({
        from: debtors[i].id,
        to: creditors[j].id,
        amount: Math.round(payment * 100) / 100,
      });
    }
    debtors[i].amount -= payment;
    creditors[j].amount -= payment;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return debts;
}
