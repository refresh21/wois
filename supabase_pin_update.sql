-- Add is_pinned column to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_chats_is_pinned ON chats(is_pinned DESC, updated_at DESC);
