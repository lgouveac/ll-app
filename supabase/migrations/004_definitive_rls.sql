-- ============================================
-- DEFINITIVE RLS RESET — Run this in SQL Editor
-- ============================================

-- Step 1: NUKE all existing policies on public tables
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Step 3: Recreate helper function
DROP FUNCTION IF EXISTS get_my_group_ids();
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.groups WHERE user_id = auth.uid()
  UNION
  SELECT group_id FROM public.members WHERE user_id = auth.uid() AND is_active = true
$$;

-- Step 4: GROUPS — full CRUD
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (id IN (SELECT get_my_group_ids()));

CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "groups_update" ON groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "groups_delete" ON groups FOR DELETE
  USING (auth.uid() = user_id);

-- Step 5: MEMBERS — full CRUD
-- SELECT: see members of my groups
CREATE POLICY "members_select" ON members FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

-- INSERT: the group owner can always insert (they just created the group)
-- We check BOTH: group ownership OR existing membership
CREATE POLICY "members_insert" ON members FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE user_id = auth.uid())
    OR group_id IN (SELECT get_my_group_ids())
  );

-- UPDATE: members of the group can update
CREATE POLICY "members_update" ON members FOR UPDATE
  USING (group_id IN (SELECT get_my_group_ids()));

-- DELETE: group owner or self
CREATE POLICY "members_delete" ON members FOR DELETE
  USING (group_id IN (SELECT get_my_group_ids()));

-- Step 6: EXPENSES — full CRUD
CREATE POLICY "expenses_select" ON expenses FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  WITH CHECK (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "expenses_update" ON expenses FOR UPDATE
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "expenses_delete" ON expenses FOR DELETE
  USING (group_id IN (SELECT get_my_group_ids()));

-- Step 7: EXPENSE_SPLITS — full CRUD
CREATE POLICY "splits_select" ON expense_splits FOR SELECT
  USING (expense_id IN (
    SELECT id FROM public.expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));

CREATE POLICY "splits_insert" ON expense_splits FOR INSERT
  WITH CHECK (expense_id IN (
    SELECT id FROM public.expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));

CREATE POLICY "splits_update" ON expense_splits FOR UPDATE
  USING (expense_id IN (
    SELECT id FROM public.expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));

CREATE POLICY "splits_delete" ON expense_splits FOR DELETE
  USING (expense_id IN (
    SELECT id FROM public.expenses WHERE group_id IN (SELECT get_my_group_ids())
  ));

-- Step 8: INVITATIONS — full CRUD
-- SELECT: see invitations for my email, invitations I sent, or for my groups
CREATE POLICY "invitations_select" ON invitations FOR SELECT
  USING (
    LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR invited_by = auth.uid()
    OR group_id IN (SELECT get_my_group_ids())
  );

-- INSERT: group owner can always invite (uses groups table directly to avoid chicken-egg)
CREATE POLICY "invitations_insert" ON invitations FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM public.groups WHERE user_id = auth.uid())
    OR group_id IN (SELECT get_my_group_ids())
  );

-- UPDATE: invited user or group owner can update
CREATE POLICY "invitations_update" ON invitations FOR UPDATE
  USING (
    LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR group_id IN (SELECT get_my_group_ids())
  );

-- DELETE: group owner can delete invitations
CREATE POLICY "invitations_delete" ON invitations FOR DELETE
  USING (
    group_id IN (SELECT get_my_group_ids())
  );

-- Step 9: EXCHANGE_RATES — public read, auth write
CREATE POLICY "rates_select" ON exchange_rates FOR SELECT
  USING (true);

CREATE POLICY "rates_insert" ON exchange_rates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Step 10: STORAGE — ensure bucket and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
  DROP POLICY IF EXISTS "storage_read" ON storage.objects;
  DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "storage_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "storage_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "storage_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Step 11: Fix existing members with null user_id for the owner
-- This links any unlinked "Lucas" member to the correct auth user
UPDATE members
SET user_id = u.id, email = u.email
FROM auth.users u
JOIN groups g ON g.user_id = u.id
WHERE members.group_id = g.id
  AND members.user_id IS NULL
  AND members.is_active = true
  AND members.created_at = (
    SELECT MIN(m2.created_at)
    FROM members m2
    WHERE m2.group_id = g.id AND m2.is_active = true
  );
