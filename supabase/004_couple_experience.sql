-- ===========================================
-- 1. PARTNERSHIPS (vínculo de casal)
-- ===========================================

CREATE TABLE public.partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  since timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_a, user_b)
);

ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partnerships_select" ON public.partnerships
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "partnerships_insert" ON public.partnerships
  FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- ===========================================
-- 2. PRIVATE MESSAGES (chat privado)
-- ===========================================

CREATE TABLE public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_private_messages_pair ON public.private_messages(
  LEAST(from_user, to_user), GREATEST(from_user, to_user), created_at DESC
);

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select" ON public.private_messages
  FOR SELECT USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "pm_insert" ON public.private_messages
  FOR INSERT WITH CHECK (auth.uid() = from_user);
CREATE POLICY "pm_update" ON public.private_messages
  FOR UPDATE USING (auth.uid() = to_user);

ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;

-- ===========================================
-- 3. LOVE NOTES (recados românticos fixados)
-- ===========================================

CREATE TABLE public.love_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.love_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.love_notes
  FOR SELECT USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "notes_insert" ON public.love_notes
  FOR INSERT WITH CHECK (auth.uid() = from_user);
CREATE POLICY "notes_delete" ON public.love_notes
  FOR DELETE USING (auth.uid() = from_user);

-- ===========================================
-- 4. MILESTONES (marcos/conquistas de casal)
-- ===========================================

CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  type text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milestones_select" ON public.milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partnerships p
      WHERE p.id = partnership_id AND (auth.uid() = p.user_a OR auth.uid() = p.user_b)
    )
  );
CREATE POLICY "milestones_insert" ON public.milestones
  FOR INSERT WITH CHECK (true);

-- ===========================================
-- 5. WISHLIST (vídeos que querem assistir juntos)
-- ===========================================

CREATE TABLE public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  video_title text NOT NULL DEFAULT '',
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  watched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_select" ON public.wishlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partnerships p
      WHERE p.id = partnership_id AND (auth.uid() = p.user_a OR auth.uid() = p.user_b)
    )
  );
CREATE POLICY "wishlist_insert" ON public.wishlist
  FOR INSERT WITH CHECK (true);
CREATE POLICY "wishlist_update" ON public.wishlist
  FOR UPDATE USING (true);
CREATE POLICY "wishlist_delete" ON public.wishlist
  FOR DELETE USING (true);
