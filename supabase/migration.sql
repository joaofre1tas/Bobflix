-- ===========================================
-- 1. TABLES
-- ===========================================

CREATE TABLE public.rooms (
  id text PRIMARY KEY,
  video_url text NOT NULL DEFAULT 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_room_id ON public.messages(room_id, created_at DESC);

CREATE TABLE public.playback_state (
  room_id text PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unstarted' CHECK (status IN ('playing','paused','buffering','unstarted')),
  time float8 NOT NULL DEFAULT 0,
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- 2. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select" ON public.rooms FOR SELECT TO anon USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "messages_select" ON public.messages FOR SELECT TO anon USING (true);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "playback_select" ON public.playback_state FOR SELECT TO anon USING (true);
CREATE POLICY "playback_insert" ON public.playback_state FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "playback_update" ON public.playback_state FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ===========================================
-- 3. ENABLE REALTIME
-- ===========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playback_state;
