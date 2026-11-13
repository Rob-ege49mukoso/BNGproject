-- Additive Preview migration only.
-- Apply after the Better Auth schema exists in the target database.
-- This file is intentionally not executed by the application startup.

DO $$
BEGIN
  IF to_regclass('public."user"') IS NULL THEN
    RAISE EXCEPTION
      'Better Auth table public."user" is required before creating elema_projects';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.elema_projects (
  id text PRIMARY KEY,
  user_id text NOT NULL
    REFERENCES public."user" (id)
    ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('api', 'agent', 'application')),
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  slug text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(config) = 'object'),
  instructions text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS elema_projects_user_created_at_idx
  ON public.elema_projects (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS elema_projects_api_user_slug_unique
  ON public.elema_projects (user_id, slug)
  WHERE type = 'api' AND slug IS NOT NULL;
