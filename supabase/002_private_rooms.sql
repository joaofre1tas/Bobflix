-- Adiciona suporte a salas com senha

ALTER TABLE public.rooms ADD COLUMN is_private boolean NOT NULL DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN password text DEFAULT NULL;

-- Função para verificar senha (não expõe a senha ao cliente)
CREATE OR REPLACE FUNCTION public.verify_room_password(p_room_id text, p_password text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = p_room_id AND password = p_password
  );
$$;
