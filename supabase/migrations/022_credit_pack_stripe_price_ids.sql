-- Après avoir créé les 4 produits ponctuels dans Stripe (live),
-- remplacez price_xxx par vos vrais Price ID puis exécutez ce script.

UPDATE credit_pack_catalog SET stripe_price_id = 'price_xxx' WHERE credits = 1000;
UPDATE credit_pack_catalog SET stripe_price_id = 'price_xxx' WHERE credits = 5000;
UPDATE credit_pack_catalog SET stripe_price_id = 'price_xxx' WHERE credits = 15000;
UPDATE credit_pack_catalog SET stripe_price_id = 'price_xxx' WHERE credits = 50000;
