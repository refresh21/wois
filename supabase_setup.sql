-- # WOIS AI - TAM SUPABASE KURULUM SQL
-- Bu sorguyu Supabase SQL Editor üzerinden "New Query" diyerek yapıştırın ve çalıştırın.
-- https://supabase.com/dashboard/project/lqhxkdgtlryxurqjerop/sql/new

-- ---------------------------------------------------------
-- 1. TABLOLARIN OLUŞTURULMASI
-- ---------------------------------------------------------

-- Notlar Tablosu
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

-- Sohbetler (Konuşma Başlıkları) Tablosu
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Yeni Sohbet',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sohbet Mesajları Tablosu
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kullanıcı Ayarları (Drive Token vb.) Tablosu
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_refresh_token TEXT,
  google_drive_connected BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------
-- 2. GÜVENLİK (RLS - ROW LEVEL SECURITY)
-- ---------------------------------------------------------

-- RLS'i Etkinleştir
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (Hata almamak için)
DROP POLICY IF EXISTS "Users can only see their own notes" ON notes;
DROP POLICY IF EXISTS "Users can only insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can only update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can only delete their own notes" ON notes;
DROP POLICY IF EXISTS "SohbetOku" ON chats;
DROP POLICY IF EXISTS "SohbetYaz" ON chats;
DROP POLICY IF EXISTS "SohbetSil" ON chats;
DROP POLICY IF EXISTS "MesajOku" ON chat_messages;
DROP POLICY IF EXISTS "MesajYaz" ON chat_messages;
DROP POLICY IF EXISTS "SettingsManage" ON user_settings;

-- Notlar Politikaları
CREATE POLICY "NotesSelect" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "NotesInsert" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "NotesUpdate" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "NotesDelete" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Sohbet Politikaları
CREATE POLICY "SohbetOku" ON chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "SohbetYaz" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SohbetYonet" ON chats FOR ALL USING (auth.uid() = user_id);

-- Mesaj Politikaları
CREATE POLICY "MesajOku" ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "MesajYaz" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ayarlar Politikaları
CREATE POLICY "SettingsManage" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 3. DEPOLAMA (STORAGE) BUCKETS & POLICIES
-- ---------------------------------------------------------

-- Bucketları oluştur
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;

-- Depolama Politikaları (Kayıtlar)
DROP POLICY IF EXISTS "Allow select recordings" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert recordings" ON storage.objects;
CREATE POLICY "Allow select recordings" ON storage.objects FOR SELECT USING (bucket_id = 'recordings');
CREATE POLICY "Allow insert recordings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recordings');
CREATE POLICY "Allow manage recordings" ON storage.objects FOR ALL USING (bucket_id = 'recordings' AND auth.uid() IS NOT NULL);

-- Depolama Politikaları (Medya)
DROP POLICY IF EXISTS "Allow select media" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert media" ON storage.objects;
CREATE POLICY "Allow select media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Allow insert media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Allow manage media" ON storage.objects FOR ALL USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);

-- ---------------------------------------------------------
-- 4. INDEKSLER & PERFORMANS
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_is_pinned ON chats(is_pinned DESC, updated_at DESC);

-- Şemayı yenile
NOTIFY pgrst, 'reload schema';
