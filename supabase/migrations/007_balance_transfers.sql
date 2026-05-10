-- ============================================
-- Migration 007: Balance transfers between groups
-- ============================================

CREATE TABLE IF NOT EXISTS balance_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  to_group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  from_currency  TEXT NOT NULL,
  to_currency    TEXT NOT NULL,
  exchange_rate  NUMERIC(12,6),
  converted_amount NUMERIC(12,2),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','cancelled')),
  note           TEXT,
  source_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  target_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  initiator_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ,
  CHECK (from_group_id <> to_group_id)
);

CREATE INDEX idx_balance_transfers_from_group ON balance_transfers(from_group_id);
CREATE INDEX idx_balance_transfers_to_group ON balance_transfers(to_group_id);
CREATE INDEX idx_balance_transfers_status ON balance_transfers(status);
CREATE INDEX idx_balance_transfers_to_member ON balance_transfers(to_member_id);

ALTER TABLE balance_transfers ENABLE ROW LEVEL SECURITY;

-- SELECT: visible to users active in either side group
CREATE POLICY "Users can view transfers of their groups"
  ON balance_transfers FOR SELECT
  USING (
    from_group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
    OR to_group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- INSERT: only the initiator (whose user_id matches from_member_id) can create
CREATE POLICY "Initiator can create transfer"
  ON balance_transfers FOR INSERT
  WITH CHECK (
    initiator_user_id = auth.uid()
    AND from_member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- UPDATE: counterparty (to_member.user_id) can approve/reject;
--         initiator can cancel; only while pending.
-- Policy must allow any UPDATE; service enforces transitions, RLS only
-- restricts WHO can update.
CREATE POLICY "Parties can update transfer"
  ON balance_transfers FOR UPDATE
  USING (
    status = 'pending'
    AND (
      to_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
      OR initiator_user_id = auth.uid()
    )
  );
