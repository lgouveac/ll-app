import type { Group, Member } from "./group";

export type TransferStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface BalanceTransfer {
  id: string;
  from_group_id: string;
  to_group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  exchange_rate: number | null;
  converted_amount: number | null;
  status: TransferStatus;
  note: string | null;
  source_expense_id: string | null;
  target_expense_id: string | null;
  initiator_user_id: string;
  created_at: string;
  resolved_at: string | null;
  from_group?: Pick<Group, "id" | "name" | "default_currency">;
  to_group?: Pick<Group, "id" | "name" | "default_currency">;
  from_member?: Pick<Member, "id" | "name" | "avatar_color">;
  to_member?: Pick<Member, "id" | "name" | "avatar_color">;
}

export interface EligibleTarget {
  group: Pick<Group, "id" | "name" | "default_currency">;
  fromMember: Pick<Member, "id" | "name" | "avatar_color">;
  toMember: Pick<Member, "id" | "name" | "avatar_color">;
}
