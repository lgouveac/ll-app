-- ============================================
-- L&L Database Schema
-- ============================================

-- Groups table
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Nosso Grupo',
  default_currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own groups"
  ON groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own groups"
  ON groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own groups"
  ON groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own groups"
  ON groups FOR DELETE USING (auth.uid() = user_id);

-- Members table
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#DC2626',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of own groups"
  ON members FOR SELECT
  USING (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert members in own groups"
  ON members FOR INSERT
  WITH CHECK (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));
CREATE POLICY "Users can update members in own groups"
  ON members FOR UPDATE
  USING (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete members in own groups"
  ON members FOR DELETE
  USING (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));

-- Expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  converted_amount NUMERIC(12,2),
  base_currency TEXT,
  exchange_rate NUMERIC(12,6),
  paid_by UUID REFERENCES members(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_url TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses of own groups"
  ON expenses FOR SELECT
  USING (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert expenses in own groups"
  ON expenses FOR INSERT
  WITH CHECK (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));
CREATE POLICY "Users can update expenses in own groups"
  ON expenses FOR UPDATE
  USING (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete expenses in own groups"
  ON expenses FOR DELETE
  USING (group_id IN (SELECT id FROM groups WHERE user_id = auth.uid()));

-- Expense splits table
CREATE TABLE expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view splits of own expenses"
  ON expense_splits FOR SELECT
  USING (expense_id IN (
    SELECT e.id FROM expenses e
    JOIN groups g ON e.group_id = g.id
    WHERE g.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert splits in own expenses"
  ON expense_splits FOR INSERT
  WITH CHECK (expense_id IN (
    SELECT e.id FROM expenses e
    JOIN groups g ON e.group_id = g.id
    WHERE g.user_id = auth.uid()
  ));
CREATE POLICY "Users can update splits in own expenses"
  ON expense_splits FOR UPDATE
  USING (expense_id IN (
    SELECT e.id FROM expenses e
    JOIN groups g ON e.group_id = g.id
    WHERE g.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete splits in own expenses"
  ON expense_splits FOR DELETE
  USING (expense_id IN (
    SELECT e.id FROM expenses e
    JOIN groups g ON e.group_id = g.id
    WHERE g.user_id = auth.uid()
  ));

-- Exchange rates cache table
CREATE TABLE exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(12,6) NOT NULL,
  fetched_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(base_currency, target_currency, fetched_at)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rates"
  ON exchange_rates FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert rates"
  ON exchange_rates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create storage bucket for receipts (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policy for receipts
-- CREATE POLICY "Authenticated users can upload receipts"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
-- CREATE POLICY "Anyone can view receipts"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'receipts');
