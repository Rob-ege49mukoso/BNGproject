
-- =========================================================
-- ELEMA API - ATOMIC AI QUOTAS
-- Migration: 20261030180000
-- Counts one successful AI request, including fallback.
-- Does not execute provider calls or expose API keys.
-- =========================================================

-- 1. Plans and daily limits
CREATE TABLE IF NOT EXISTS public.ai_quota_plans (
  plan_key TEXT PRIMARY KEY,
  daily_limit INTEGER NOT NULL CHECK (daily_limit > 0)
);

INSERT INTO public.ai_quota_plans (plan_key, daily_limit)
VALUES
  ('free', 100),
  ('premium_launch', 1000),
  ('premium', 2000),
  ('premium_plus', 5000)
ON CONFLICT (plan_key) DO NOTHING;


-- 2. User plan assignments
-- Every new account starts on the Free plan.
CREATE TABLE IF NOT EXISTS public.ai_user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id)
    ON DELETE CASCADE,
  plan_key TEXT NOT NULL DEFAULT 'free'
    REFERENCES public.ai_quota_plans(plan_key),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3. Daily counters
CREATE TABLE IF NOT EXISTS public.ai_quota_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id)
    ON DELETE CASCADE,
  quota_date DATE NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0
    CHECK (used_count >= 0),
  reserved_count INTEGER NOT NULL DEFAULT 0
    CHECK (reserved_count >= 0),
  PRIMARY KEY (user_id, quota_date)
);


-- 4. Individual reservations
CREATE TABLE IF NOT EXISTS public.ai_quota_reservations (
  request_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id)
    ON DELETE CASCADE,
  quota_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'consumed', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);


-- 5. Automatically assign Free to new accounts
CREATE OR REPLACE FUNCTION public.assign_default_ai_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ai_user_plans (user_id, plan_key)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ai_plan
ON auth.users;

CREATE TRIGGER on_auth_user_created_ai_plan
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_ai_plan();


-- 6. Reserve one request atomically
CREATE OR REPLACE FUNCTION public.reserve_ai_quota(
  p_request_id UUID
)
RETURNS TABLE (
  allowed BOOLEAN,
  plan_key TEXT,
  daily_limit INTEGER,
  used_count INTEGER,
  reserved_count INTEGER,
  remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
  v_plan TEXT;
  v_limit INTEGER;
  v_used INTEGER;
  v_reserved INTEGER;
  v_inserted INTEGER;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Request ID required';
  END IF;

  v_date := (NOW() AT TIME ZONE 'UTC')::DATE;

  SELECT COALESCE(up.plan_key, 'free')
  INTO v_plan
  FROM public.ai_user_plans up
  WHERE up.user_id = v_user_id;

  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  SELECT p.daily_limit
  INTO v_limit
  FROM public.ai_quota_plans p
  WHERE p.plan_key = v_plan;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Unknown AI quota plan';
  END IF;

  INSERT INTO public.ai_quota_daily (
    user_id, quota_date
  )
  VALUES (v_user_id, v_date)
  ON CONFLICT (user_id, quota_date) DO NOTHING;

  -- Lock the user's daily counter to serialize requests.
  SELECT d.used_count, d.reserved_count
  INTO v_used, v_reserved
  FROM public.ai_quota_daily d
  WHERE d.user_id = v_user_id
    AND d.quota_date = v_date
  FOR UPDATE;

  IF v_used + v_reserved >= v_limit THEN
    RETURN QUERY SELECT
      FALSE, v_plan, v_limit, v_used, v_reserved, 0;
    RETURN;
  END IF;

  -- Prevent the same request ID from being reserved twice.
  INSERT INTO public.ai_quota_reservations (
    request_id, user_id, quota_date
  )
  VALUES (p_request_id, v_user_id, v_date)
  ON CONFLICT (request_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN QUERY SELECT
      FALSE, v_plan, v_limit, v_used, v_reserved,
      GREATEST(v_limit - v_used - v_reserved, 0);
    RETURN;
  END IF;

  UPDATE public.ai_quota_daily
  SET reserved_count = reserved_count + 1
  WHERE user_id = v_user_id
    AND quota_date = v_date;

  v_reserved := v_reserved + 1;

  RETURN QUERY SELECT
    TRUE, v_plan, v_limit, v_used, v_reserved,
    GREATEST(v_limit - v_used - v_reserved, 0);
END;
$$;


-- 7. Finish a reservation
-- Success consumes one request.
-- Failure releases the reservation without consuming quota.
CREATE OR REPLACE FUNCTION public.finish_ai_quota(
  p_request_id UUID,
  p_success BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_success IS NULL THEN
    RAISE EXCEPTION 'Success status required';
  END IF;

  UPDATE public.ai_quota_reservations
  SET
    status = CASE
      WHEN p_success THEN 'consumed'
      ELSE 'released'
    END,
    finished_at = NOW()
  WHERE request_id = p_request_id
    AND user_id = v_user_id
    AND status = 'reserved'
  RETURNING quota_date INTO v_date;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.ai_quota_daily
  SET
    reserved_count = GREATEST(reserved_count - 1, 0),
    used_count = used_count + CASE
      WHEN p_success THEN 1
      ELSE 0
    END
  WHERE user_id = v_user_id
    AND quota_date = v_date;

  RETURN TRUE;
END;
$$;


-- 8. Security: no direct table access from client apps.
ALTER TABLE public.ai_quota_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quota_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quota_reservations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_quota_plans FROM anon, authenticated;
REVOKE ALL ON public.ai_user_plans FROM anon, authenticated;
REVOKE ALL ON public.ai_quota_daily FROM anon, authenticated;
REVOKE ALL ON public.ai_quota_reservations FROM anon, authenticated;

GRANT ALL ON public.ai_quota_plans TO service_role;
GRANT ALL ON public.ai_user_plans TO service_role;
GRANT ALL ON public.ai_quota_daily TO service_role;
GRANT ALL ON public.ai_quota_reservations TO service_role;

REVOKE ALL ON FUNCTION public.reserve_ai_quota(UUID)
FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.finish_ai_quota(UUID, BOOLEAN)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reserve_ai_quota(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.finish_ai_quota(UUID, BOOLEAN)
TO authenticated;
