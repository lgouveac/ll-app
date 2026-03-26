-- ============================================
-- Migration 002: Multi-user + Invitations
-- ============================================

-- 1. Create receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- 2. Add user_id and email to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  responded_at TIMESTAMPTZ,
  UNIQUE(group_id, email)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Invited user can see their own invitations
CREATE POLICY "Users can view invitations sent to their email"
  ON invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
  );

-- Group owner can create invitations
CREATE POLICY "Group owners can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM groups WHERE user_id = auth.uid())
  );

-- Invited user can update their invitation (accept/decline)
CREATE POLICY "Invited users can respond to invitations"
  ON invitations FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 4. Update RLS on groups: members can also view the group
DROP POLICY IF EXISTS "Users can view own groups" ON groups;
CREATE POLICY "Users can view groups they belong to"
  ON groups FOR SELECT
  USING (
    user_id = auth.uid()
    OR id IN (
      SELECT group_id FROM members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 5. Update RLS on members: group members can view other members
DROP POLICY IF EXISTS "Users can view members of own groups" ON members;
CREATE POLICY "Users can view members of their groups"
  ON members FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 6. Update RLS on expenses: group members can view/create expenses
DROP POLICY IF EXISTS "Users can view expenses of own groups" ON expenses;
CREATE POLICY "Users can view expenses of their groups"
  ON expenses FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can insert expenses in own groups" ON expenses;
CREATE POLICY "Users can insert expenses in their groups"
  ON expenses FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update expenses in own groups" ON expenses;
CREATE POLICY "Users can update expenses in their groups"
  ON expenses FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete expenses in own groups" ON expenses;
CREATE POLICY "Users can delete expenses in their groups"
  ON expenses FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 7. Update RLS on expense_splits similarly
DROP POLICY IF EXISTS "Users can view splits of own expenses" ON expense_splits;
CREATE POLICY "Users can view splits of their group expenses"
  ON expense_splits FOR SELECT
  USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      WHERE e.group_id IN (
        SELECT id FROM groups WHERE user_id = auth.uid()
        UNION
        SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert splits in own expenses" ON expense_splits;
CREATE POLICY "Users can insert splits in their group expenses"
  ON expense_splits FOR INSERT
  WITH CHECK (
    expense_id IN (
      SELECT e.id FROM expenses e
      WHERE e.group_id IN (
        SELECT id FROM groups WHERE user_id = auth.uid()
        UNION
        SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can update splits in own expenses" ON expense_splits;
CREATE POLICY "Users can update splits in their group expenses"
  ON expense_splits FOR UPDATE
  USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      WHERE e.group_id IN (
        SELECT id FROM groups WHERE user_id = auth.uid()
        UNION
        SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete splits in own expenses" ON expense_splits;
CREATE POLICY "Users can delete splits in their group expenses"
  ON expense_splits FOR DELETE
  USING (
    expense_id IN (
      SELECT e.id FROM expenses e
      WHERE e.group_id IN (
        SELECT id FROM groups WHERE user_id = auth.uid()
        UNION
        SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- 8. Members insert/update for group members too
DROP POLICY IF EXISTS "Users can insert members in own groups" ON members;
CREATE POLICY "Users can insert members in their groups"
  ON members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update members in own groups" ON members;
CREATE POLICY "Users can update members in their groups"
  ON members FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE user_id = auth.uid()
      UNION
      SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
    )
  );
