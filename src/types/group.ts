export interface Group {
  id: string;
  user_id: string;
  name: string;
  default_currency: string;
  budget: number | null;
  created_at: string;
}

export interface Member {
  id: string;
  group_id: string;
  name: string;
  avatar_color: string;
  is_active: boolean;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  group_id: string;
  email: string;
  invited_by: string;
  member_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
  group?: Group;
  member?: Member;
}
