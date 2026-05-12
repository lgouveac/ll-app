import { supabase } from "@/integrations/supabase/client";
import { convertAmountForDate } from "./currencyService";
import type { BalanceTransfer, EligibleTarget } from "@/types/transfer";
import type { Group, Member } from "@/types/group";

const SELECT_FULL = `
  *,
  from_group:groups!balance_transfers_from_group_id_fkey(id, name, default_currency),
  to_group:groups!balance_transfers_to_group_id_fkey(id, name, default_currency),
  from_member:members!balance_transfers_from_member_id_fkey(id, name, avatar_color),
  to_member:members!balance_transfers_to_member_id_fkey(id, name, avatar_color)
`;

export async function getMyPendingTransfers(): Promise<BalanceTransfer[]> {
  const { data, error } = await supabase
    .from("balance_transfers")
    .select(SELECT_FULL)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BalanceTransfer[];
}

/**
 * Find groups where BOTH the initiator (current user) and the counterparty
 * (`counterpartyUserId`) are active members. Excludes the source group.
 */
export async function listEligibleTargetGroups(
  sourceGroupId: string,
  counterpartyUserId: string,
): Promise<EligibleTarget[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Groups where current user is an active member
  const { data: mine, error: mineErr } = await supabase
    .from("members")
    .select("id, name, avatar_color, group_id, groups(id, name, default_currency)")
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (mineErr) throw mineErr;

  // Groups where counterparty is an active member
  const { data: theirs, error: theirsErr } = await supabase
    .from("members")
    .select("id, name, avatar_color, group_id")
    .eq("user_id", counterpartyUserId)
    .eq("is_active", true);
  if (theirsErr) throw theirsErr;

  const theirsByGroup = new Map<string, Pick<Member, "id" | "name" | "avatar_color">>();
  for (const m of theirs ?? []) {
    theirsByGroup.set(m.group_id as string, {
      id: m.id as string,
      name: m.name as string,
      avatar_color: m.avatar_color as string,
    });
  }

  const out: EligibleTarget[] = [];
  for (const row of mine ?? []) {
    const groupId = row.group_id as string;
    if (groupId === sourceGroupId) continue;
    const counterMember = theirsByGroup.get(groupId);
    if (!counterMember) continue;
    const group = row.groups as unknown as Pick<Group, "id" | "name" | "default_currency"> | null;
    if (!group) continue;
    out.push({
      group,
      fromMember: { id: row.id as string, name: row.name as string, avatar_color: row.avatar_color as string },
      toMember: counterMember,
    });
  }
  return out;
}

interface CreateTransferInput {
  fromGroupId: string;
  toGroupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  note?: string | null;
}

export async function createTransfer(input: CreateTransferInput): Promise<BalanceTransfer> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let exchange_rate: number | null = null;
  let converted_amount: number | null = null;
  if (input.fromCurrency !== input.toCurrency) {
    const today = new Date().toISOString().slice(0, 10);
    const result = await convertAmountForDate(input.amount, input.fromCurrency, input.toCurrency, today);
    exchange_rate = result.rate;
    converted_amount = result.converted;
  }

  const { data, error } = await supabase
    .from("balance_transfers")
    .insert({
      from_group_id: input.fromGroupId,
      to_group_id: input.toGroupId,
      from_member_id: input.fromMemberId,
      to_member_id: input.toMemberId,
      amount: input.amount,
      from_currency: input.fromCurrency,
      to_currency: input.toCurrency,
      exchange_rate,
      converted_amount,
      note: input.note ?? null,
      initiator_user_id: user.id,
    })
    .select(SELECT_FULL)
    .single();
  if (error) throw error;
  return data as unknown as BalanceTransfer;
}

export async function cancelTransfer(transferId: string): Promise<void> {
  const { error } = await supabase
    .from("balance_transfers")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("id", transferId)
    .eq("status", "pending");
  if (error) throw error;
}

export async function rejectTransfer(transferId: string): Promise<void> {
  const { error } = await supabase
    .from("balance_transfers")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", transferId)
    .eq("status", "pending");
  if (error) throw error;
}

/**
 * Approve a transfer. Inserts the pair of mirrored expenses + splits and
 * flips status to 'approved'. Best-effort rollback if any step fails.
 */
export async function approveTransfer(transferId: string): Promise<void> {
  const { data: transfer, error: fetchErr } = await supabase
    .from("balance_transfers")
    .select(SELECT_FULL)
    .eq("id", transferId)
    .single();
  if (fetchErr) throw fetchErr;
  if (!transfer) throw new Error("Transfer not found");
  if (transfer.status !== "pending") throw new Error("Transfer is no longer pending");

  const t = transfer as unknown as BalanceTransfer;
  const fromGroup = t.from_group!;
  const toGroup = t.to_group!;

  // Resolve the counterpart members in the destination group (by user_id).
  // We need: the "from_member" equivalent and the "to_member" equivalent
  // in the destination group.
  // from_member is the initiator (debtor); to_member is the approver (creditor).
  const { data: fromUserRow } = await supabase
    .from("members")
    .select("user_id")
    .eq("id", t.from_member_id)
    .single();
  const { data: toUserRow } = await supabase
    .from("members")
    .select("user_id")
    .eq("id", t.to_member_id)
    .single();
  const fromUserId = fromUserRow?.user_id;
  const toUserId = toUserRow?.user_id;
  if (!fromUserId || !toUserId) {
    throw new Error("Member user_id not resolved");
  }

  const { data: destMembers, error: destErr } = await supabase
    .from("members")
    .select("id, user_id, name, avatar_color")
    .eq("group_id", t.to_group_id)
    .in("user_id", [fromUserId, toUserId])
    .eq("is_active", true);
  if (destErr) throw destErr;

  const destFrom = (destMembers ?? []).find((m) => m.user_id === fromUserId);
  const destTo = (destMembers ?? []).find((m) => m.user_id === toUserId);
  if (!destFrom || !destTo) {
    throw new Error("Destination group is missing one of the parties");
  }

  const today = new Date().toISOString().slice(0, 10);
  const sourceAmount = t.amount;
  const targetAmount = t.converted_amount ?? t.amount;

  // 1. Source expense: in from_group, "paid_by" = to_member (creditor),
  //    split 100% to from_member (debtor). This cancels the debt.
  const { data: srcExp, error: srcErr } = await supabase
    .from("expenses")
    .insert({
      group_id: t.from_group_id,
      description: `Transferencia para ${toGroup.name}`,
      amount: sourceAmount,
      currency: t.from_currency,
      paid_by: t.to_member_id,
      date: today,
      category: "transfer",
      notes: t.note,
    })
    .select()
    .single();
  if (srcErr) throw srcErr;

  const { error: srcSplitErr } = await supabase
    .from("expense_splits")
    .insert({
      expense_id: srcExp.id,
      member_id: t.from_member_id,
      amount: sourceAmount,
      percentage: 100,
    });
  if (srcSplitErr) {
    await supabase.from("expenses").delete().eq("id", srcExp.id);
    throw srcSplitErr;
  }

  // 2. Target expense: in to_group, "paid_by" = destFrom (debtor "lent"),
  //    split 100% to destTo (creditor "owes"). This creates the reverse debt.
  const { data: tgtExp, error: tgtErr } = await supabase
    .from("expenses")
    .insert({
      group_id: t.to_group_id,
      description: `Transferencia de ${fromGroup.name}`,
      amount: targetAmount,
      currency: t.to_currency,
      converted_amount: null,
      base_currency: null,
      exchange_rate: null,
      paid_by: destFrom.id,
      date: today,
      category: "transfer",
      notes: t.note,
    })
    .select()
    .single();
  if (tgtErr) {
    await supabase.from("expense_splits").delete().eq("expense_id", srcExp.id);
    await supabase.from("expenses").delete().eq("id", srcExp.id);
    throw tgtErr;
  }

  const { error: tgtSplitErr } = await supabase
    .from("expense_splits")
    .insert({
      expense_id: tgtExp.id,
      member_id: destTo.id,
      amount: targetAmount,
      percentage: 100,
    });
  if (tgtSplitErr) {
    await supabase.from("expenses").delete().eq("id", tgtExp.id);
    await supabase.from("expense_splits").delete().eq("expense_id", srcExp.id);
    await supabase.from("expenses").delete().eq("id", srcExp.id);
    throw tgtSplitErr;
  }

  // 3. Flip status and link the expenses
  const { error: updateErr } = await supabase
    .from("balance_transfers")
    .update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      source_expense_id: srcExp.id,
      target_expense_id: tgtExp.id,
    })
    .eq("id", transferId)
    .eq("status", "pending");
  if (updateErr) {
    await supabase.from("expense_splits").delete().eq("expense_id", tgtExp.id);
    await supabase.from("expenses").delete().eq("id", tgtExp.id);
    await supabase.from("expense_splits").delete().eq("expense_id", srcExp.id);
    await supabase.from("expenses").delete().eq("id", srcExp.id);
    throw updateErr;
  }

}
