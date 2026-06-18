-- Table de tracking des tentatives de réinitialisation de mot de passe
-- Rate limit : 3 tentatives par email par fenêtre de 15 minutes
-- Rate limit : 5 tentatives par IP par fenêtre de 1 heure

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  text NOT NULL,          -- email ou IP
  action      text NOT NULL DEFAULT 'password_reset',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index pour les lookups rapides par identifier + action + fenêtre de temps
CREATE INDEX IF NOT EXISTS auth_rate_limits_identifier_action_idx
  ON auth_rate_limits (identifier, action, created_at DESC);

-- Pas de RLS — accès uniquement via service_role (API route serveur)
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Nettoyage automatique : supprimer les entrées de plus de 24h
-- (cron job ou via la fonction ci-dessous)
CREATE OR REPLACE FUNCTION cleanup_auth_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth_rate_limits WHERE created_at < now() - interval '24 hours';
END;
$$;
