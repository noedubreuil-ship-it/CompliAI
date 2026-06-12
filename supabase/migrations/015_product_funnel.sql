-- Parcours produit C1 : créer projet → audit → consultant IA
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS product_funnel_completed_at timestamptz;

COMMENT ON COLUMN profiles.product_funnel_completed_at IS
  'Date de fin du parcours guidé (3 étapes) affiché après onboarding profil';
