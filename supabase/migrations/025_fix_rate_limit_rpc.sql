-- ─── Migration 025 — Correctif RPC upsert_ai_rate_limit ─────────────────────
--
-- Problème (audit H16) : checkRateLimit dans lib/credits.ts effectue
-- 3 allers-retours Postgres successifs + tentative d'appel à une RPC
-- inexistante `increment_count`. En cas d'upsert sur un conflit, la
-- fonction n'incrémentait pas correctement le compteur et retournait
-- toujours `true`.
--
-- Solution : RPC atomique qui fait INSERT … ON CONFLICT DO UPDATE + 1
-- en une seule transaction et retourne { count, allowed }.

CREATE OR REPLACE FUNCTION upsert_ai_rate_limit(
  p_user_id     uuid,
  p_window_start timestamptz,
  p_rate_limit  integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO ai_rate_limits (user_id, window_start, count)
  VALUES (p_user_id, p_window_start, 1)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET count = ai_rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN json_build_object(
    'count',   v_count,
    'allowed', v_count <= p_rate_limit
  );
END;
$$;

COMMENT ON FUNCTION upsert_ai_rate_limit(uuid, timestamptz, integer) IS
  'Incrémente atomiquement le compteur de rate limit IA et retourne si la requête est autorisée.';
