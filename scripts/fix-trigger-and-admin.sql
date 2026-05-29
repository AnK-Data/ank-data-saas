-- ═══════════════════════════════════════════════════════════════
-- ANK Data — Correção do trigger + criação do Admin Master
-- Execute TODO no Supabase SQL Editor e clique em Run
-- ═══════════════════════════════════════════════════════════════

-- ── PASSO 1: Permite tenant_id NULL (admin não tem franquia) ────
ALTER TABLE public.profiles
  ALTER COLUMN tenant_id DROP NOT NULL;

-- ── PASSO 2: Corrige o trigger com os campos reais ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, tenant_id, nome, papel, created_at)
  VALUES (
    new.id,
    NULL,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'papel', 'franchise_user'),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- ── PASSO 3: Recria o trigger ────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ── PASSO 4: Cria o Admin Master ─────────────────────────────────
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'canhoto.works@gmail.com';

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      'canhoto.works@gmail.com',
      crypt('!6088El98!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin ANK Data"}'::jsonb,
      now(), now(), '', ''
    );

    RAISE NOTICE 'Usuário auth criado — ID: %', v_uid;
  ELSE
    RAISE NOTICE 'Usuário já existia — ID: %', v_uid;
  END IF;

  -- Upsert do perfil com os campos corretos
  INSERT INTO public.profiles (id, tenant_id, nome, papel, created_at)
  VALUES (v_uid, NULL, 'Admin ANK Data', 'ank_admin', now())
  ON CONFLICT (id) DO UPDATE
    SET papel = 'ank_admin',
        nome  = 'Admin ANK Data';

  RAISE NOTICE 'Perfil ank_admin configurado com sucesso!';
END;
$$;

-- ── VERIFICAÇÃO ──────────────────────────────────────────────────
SELECT
  u.email,
  p.nome,
  p.papel,
  p.tenant_id,
  u.email_confirmed_at IS NOT NULL AS confirmado
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'canhoto.works@gmail.com';
