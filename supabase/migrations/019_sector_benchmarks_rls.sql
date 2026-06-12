-- RLS pour sector_benchmarks (agrégats anonymisés lus par le dashboard benchmark)

ALTER TABLE sector_benchmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read sector benchmarks" ON sector_benchmarks;
CREATE POLICY "Authenticated users can read sector benchmarks"
  ON sector_benchmarks FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage sector benchmarks" ON sector_benchmarks;
CREATE POLICY "Service role can manage sector benchmarks"
  ON sector_benchmarks FOR ALL
  USING (auth.role() = 'service_role');
