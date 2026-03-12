-- Run this SQL in the Supabase SQL Editor
-- https://lqhxkdgtlryxurqjerop.supabase.co → SQL Editor → New Query

-- 1. Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- 2. Enable RLS and allow all operations (no auth for now)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if re-running
DROP POLICY IF EXISTS "Allow all operations" ON notes;

CREATE POLICY "Allow all operations" ON notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

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
