-- Add budget (spending limit) to groups
ALTER TABLE groups ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2) DEFAULT NULL;
