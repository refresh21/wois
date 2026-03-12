-- Run this SQL in the Supabase SQL Editor
-- https://lqhxkdgtlryxurqjerop.supabase.co → SQL Editor → New Query

-- !!! EĞER "user_id column not found" HATASI ALIYORSANIZ AŞAĞIDAKİ 2 SATIRI ÇALIŞTIRIN !!!
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
-- NOTIFY pgrst, 'reload schema';

-- 1. Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  transcript TEXT,
  summary TEXT,
  personal_notes TEXT,
  duration TEXT,
  type TEXT DEFAULT 'voice',
  audio_url TEXT,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);

-- 2. Enable RLS and restrict access to owner
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop existing generic policy
DROP POLICY IF EXISTS "Allow all operations" ON notes;

-- Create owner-only policies
CREATE POLICY "Users can view their own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Storage: Create buckets and policies
-- After running this SQL, go to Supabase Dashboard → Storage:
-- Create bucket "recordings" → Set to PUBLIC
-- Create bucket "media" → Set to PUBLIC
-- Then run the following to allow uploads:

-- Allow public uploads to recordings bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings bucket
CREATE POLICY "Allow public read recordings" ON storage.objects FOR SELECT USING (bucket_id = 'recordings');
CREATE POLICY "Allow public insert recordings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recordings');
CREATE POLICY "Allow public update recordings" ON storage.objects FOR UPDATE USING (bucket_id = 'recordings');
CREATE POLICY "Allow public delete recordings" ON storage.objects FOR DELETE USING (bucket_id = 'recordings');

-- Storage policies for media bucket
CREATE POLICY "Allow public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Allow public insert media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Allow public update media" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
CREATE POLICY "Allow public delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media');
