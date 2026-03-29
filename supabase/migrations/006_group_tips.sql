-- Add group_type to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_type TEXT;

-- Tips cache table
CREATE TABLE IF NOT EXISTS group_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  tips JSONB NOT NULL DEFAULT '[]',
  query TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id)
);

ALTER TABLE group_tips ENABLE ROW LEVEL SECURITY;

-- Anyone in the group can read tips
CREATE POLICY "tips_select" ON group_tips FOR SELECT USING (
  group_id IN (SELECT get_my_group_ids())
);
CREATE POLICY "tips_insert" ON group_tips FOR INSERT WITH CHECK (
  group_id IN (SELECT get_my_group_ids())
);
CREATE POLICY "tips_update" ON group_tips FOR UPDATE USING (
  group_id IN (SELECT get_my_group_ids())
);
CREATE POLICY "tips_delete" ON group_tips FOR DELETE USING (
  group_id IN (SELECT get_my_group_ids())
);
