-- ============================================
-- Migration 003: Fix circular RLS + helper function
-- ============================================

-- Create a SECURITY DEFINER function to break circular RLS dependency
-- This function bypasses RLS when checking membership
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Groups I own
  SELECT id FROM groups WHERE user_id = auth.uid()
  UNION
  -- Groups I'm a member of
  SELECT group_id FROM members WHERE user_id = auth.uid() AND is_active = true
$$;

-- Fix groups SELECT policy
DROP POLICY IF EXISTS "Users can view groups they belong to" ON groups;
DROP POLICY IF EXISTS "Users can view own groups" ON groups;
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (id IN (SELECT get_my_group_ids()));

-- Fix members policies (no more circular ref)
DROP POLICY IF EXISTS "Users can view members of their groups" ON members;
DROP POLICY IF EXISTS "Users can view members of own groups" ON members;
CREATE POLICY "Users can view members of their groups"
  ON members FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

DROP POLICY IF EXISTS "Users can insert members in their groups" ON members;
DROP POLICY IF EXISTS "Users can insert members in own groups" ON members;
CREATE POLICY "Users can insert members in their groups"
  ON members FOR INSERT
  WITH CHECK (group_id IN (SELECT get_my_group_ids()));

DROP POLICY IF EXISTS "Users can update members in their groups" ON members;
DROP POLICY IF EXISTS "Users can update members in own groups" ON members;
CREATE POLICY "Users can update members in their groups"
  ON members FOR UPDATE
  USING (group_id IN (SELECT get_my_group_ids()));

-- Fix expenses policies
DROP POLICY IF EXISTS "Users can view expenses of their groups" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses of own groups" ON expenses;
CREATE POLICY "Users can view expenses of their groups"
  ON expenses FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

DROP POLICY IF EXISTS "Users can insert expenses in their groups" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses in own groups" ON expenses;
CREATE POLICY "Users can insert expenses in their groups"
  ON expenses FOR INSERT
  WITH CHECK (group_id IN (SELECT get_my_group_ids()));

DROP POLICY IF EXISTS "Users can update expenses in their groups" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses in own groups" ON expenses;
CREATE POLICY "Users can update expenses in their groups"
  ON expenses FOR UPDATE
  USING (group_id IN (SELECT get_my_group_ids()));

DROP POLICY IF EXISTS "Users can delete expenses in their groups" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses of own groups" ON expenses;
CREATE POLICY "Users can delete expenses in their groups"
  ON expenses FOR DELETE
  USING (group_id IN (SELECT get_my_group_ids()));

-- Fix expense_splits policies
DROP POLICY IF EXISTS "Users can view splits of their group expenses" ON expense_splits;
DROP POLICY IF EXISTS "Users can view splits of own expenses" ON expense_splits;
CREATE POLICY "Users can view splits of their group expenses"
  ON expense_splits FOR SELECT
  USING (expense_id IN (
    SELECT id FROM expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));

DROP POLICY IF EXISTS "Users can insert splits in their group expenses" ON expense_splits;
DROP POLICY IF EXISTS "Users can insert splits in own expenses" ON expense_splits;
CREATE POLICY "Users can insert splits in their group expenses"
  ON expense_splits FOR INSERT
  WITH CHECK (expense_id IN (
    SELECT id FROM expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));

DROP POLICY IF EXISTS "Users can update splits in their group expenses" ON expense_splits;
DROP POLICY IF EXISTS "Users can update splits in own expenses" ON expense_splits;
CREATE POLICY "Users can update splits in their group expenses"
  ON expense_splits FOR UPDATE
  USING (expense_id IN (
    SELECT id FROM expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));

DROP POLICY IF EXISTS "Users can delete splits in their group expenses" ON expense_splits;
DROP POLICY IF EXISTS "Users can delete splits in own expenses" ON expense_splits;
CREATE POLICY "Users can delete splits in their group expenses"
  ON expense_splits FOR DELETE
  USING (expense_id IN (
    SELECT id FROM expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));
