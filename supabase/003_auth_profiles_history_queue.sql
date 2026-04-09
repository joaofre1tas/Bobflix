-- ===========================================
-- 1. PROFILES (auto-criado via trigger no signup)
-- ===========================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- 2. STORAGE BUCKET (avatars)
-- ===========================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===========================================
-- 3. WATCH HISTORY
-- ===========================================

CREATE TABLE public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text REFERENCES public.rooms(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  watched_with uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  watched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_watch_history_user ON public.watch_history(user_id, watched_at DESC);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_select_own" ON public.watch_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "history_insert" ON public.watch_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- 4. ROOM QUEUE (playlist)
-- ===========================================

CREATE TABLE public.room_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  played boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_queue_room ON public.room_queue(room_id, position);

ALTER TABLE public.room_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queue_select" ON public.room_queue FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "queue_insert" ON public.room_queue FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "queue_update" ON public.room_queue FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "queue_delete" ON public.room_queue FOR DELETE TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_queue;

-- ===========================================
-- 5. UPDATE EXISTING TABLES FOR AUTH
-- ===========================================

-- Allow authenticated role on existing tables
CREATE POLICY "rooms_select_auth" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_insert_auth" ON public.rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "rooms_update_auth" ON public.rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "messages_select_auth" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages_insert_auth" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "playback_select_auth" ON public.playback_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "playback_insert_auth" ON public.playback_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "playback_update_auth" ON public.playback_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
