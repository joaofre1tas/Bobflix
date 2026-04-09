-- Convites de parceria, desvincular com purge completo, políticas auxiliares

-- ===========================================
-- 1. PARTNERSHIP INVITES
-- ===========================================

CREATE TABLE public.partnership_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  accepted_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_partnership_invites_inviter ON public.partnership_invites(inviter_id);

ALTER TABLE public.partnership_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partnership_invites_insert"
  ON public.partnership_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "partnership_invites_select_own"
  ON public.partnership_invites FOR SELECT
  USING (auth.uid() = inviter_id);

-- ===========================================
-- 2. PEEK INVITE (anon + auth — link público)
-- ===========================================

CREATE OR REPLACE FUNCTION public.peek_partner_invite(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.partnership_invites%ROWTYPE;
  inv_name text;
BEGIN
  SELECT * INTO inv FROM public.partnership_invites WHERE token = invite_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT display_name INTO inv_name FROM public.profiles WHERE id = inv.inviter_id;
  RETURN jsonb_build_object(
    'found', true,
    'inviter_id', inv.inviter_id,
    'inviter_name', COALESCE(inv_name, 'Alguém especial'),
    'expires_at', inv.expires_at,
    'valid', inv.used_at IS NULL AND inv.expires_at > now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.peek_partner_invite(text) TO anon, authenticated;

-- ===========================================
-- 3. ACCEPT INVITE
-- ===========================================

CREATE OR REPLACE FUNCTION public.accept_partner_invite(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.partnership_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.partnership_invites
  WHERE token = invite_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  IF inv.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  IF inv.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF inv.inviter_id = uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_accept_own');
  END IF;

  IF EXISTS (SELECT 1 FROM public.partnerships WHERE user_a = uid OR user_b = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'you_have_partnership');
  END IF;

  IF EXISTS (SELECT 1 FROM public.partnerships WHERE user_a = inv.inviter_id OR user_b = inv.inviter_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inviter_has_partnership');
  END IF;

  INSERT INTO public.partnerships (user_a, user_b)
  VALUES (LEAST(inv.inviter_id, uid), GREATEST(inv.inviter_id, uid));

  UPDATE public.partnership_invites
  SET used_at = now(), accepted_user_id = uid
  WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_partner_invite(text) TO authenticated;

-- ===========================================
-- 4. UNLINK + PURGE (histórico a dois, recados, PM, wishlist, marcos, convites)
-- ===========================================

CREATE OR REPLACE FUNCTION public.unlink_partnership_and_purge(p_partnership_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.partnerships%ROWTYPE;
  uid uuid := auth.uid();
  a uuid;
  b uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO p FROM public.partnerships WHERE id = p_partnership_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF p.user_a != uid AND p.user_b != uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  a := p.user_a;
  b := p.user_b;

  DELETE FROM public.watch_history
  WHERE (user_id = a AND watched_with = b) OR (user_id = b AND watched_with = a);

  DELETE FROM public.love_notes
  WHERE (from_user = a AND to_user = b) OR (from_user = b AND to_user = a);

  DELETE FROM public.private_messages
  WHERE (from_user = a AND to_user = b) OR (from_user = b AND to_user = a);

  DELETE FROM public.wishlist WHERE partnership_id = p_partnership_id;
  DELETE FROM public.milestones WHERE partnership_id = p_partnership_id;

  DELETE FROM public.partnership_invites
  WHERE inviter_id IN (a, b) OR accepted_user_id IN (a, b);

  DELETE FROM public.partnerships WHERE id = p_partnership_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlink_partnership_and_purge(uuid) TO authenticated;

-- ===========================================
-- 5. PARTNERSHIPS: permitir delete pelo membro (opcional; app usa RPC)
-- ===========================================

CREATE POLICY "partnerships_delete" ON public.partnerships
  FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ===========================================
-- 6. MILESTONES: restringir insert ao casal do partnership_id
-- ===========================================

DROP POLICY IF EXISTS "milestones_insert" ON public.milestones;

CREATE POLICY "milestones_insert" ON public.milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partnerships p
      WHERE p.id = partnership_id AND (auth.uid() = p.user_a OR auth.uid() = p.user_b)
    )
  );
