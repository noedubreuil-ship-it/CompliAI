import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'public' } }
  )

  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

  // Count total via head
  const { count: total, error: e0 } = await supabase
    .from('legal_chunks')
    .select('*', { count: 'exact', head: true })
  console.log('TOTAL legal_chunks:', total, e0?.message)

  // Count per regulation using pagination
  const pageSize = 1000
  let from = 0
  const byReg: Record<string, { total: number; withEmb: number; granularities: Set<string>; lastUpdate: string }> = {}

  while (true) {
    const { data, error } = await supabase
      .from('legal_chunks')
      .select('regulation, embedding, granularity, updated_at')
      .range(from, from + pageSize - 1)

    if (error) { console.error(error.message); break }
    if (!data || data.length === 0) break

    for (const row of data) {
      const reg = row.regulation || 'NULL'
      if (!byReg[reg]) byReg[reg] = { total: 0, withEmb: 0, granularities: new Set(), lastUpdate: '' }
      byReg[reg].total++
      if (row.embedding) byReg[reg].withEmb++
      if (row.granularity) byReg[reg].granularities.add(row.granularity)
      if (row.updated_at > byReg[reg].lastUpdate) byReg[reg].lastUpdate = row.updated_at
    }

    console.log(`Fetched rows ${from} - ${from + data.length - 1}`)
    from += pageSize
    if (data.length < pageSize) break
  }

  console.log('\n=== RÉSULTAT PAR RÈGLEMENT ===')
  console.log('regulation | chunks_total | with_embedding | granularities | last_update')
  console.log('-----------|-------------|----------------|---------------|------------')
  const sorted = Object.entries(byReg).sort((a, b) => b[1].total - a[1].total)
  for (const [reg, stats] of sorted) {
    console.log(`${reg} | ${stats.total} | ${stats.withEmb} | ${[...stats.granularities].join(',')} | ${stats.lastUpdate}`)
  }

  const grandTotal = Object.values(byReg).reduce((s, v) => s + v.total, 0)
  console.log('\nGRAND TOTAL (agrégé):', grandTotal)

  // Parent-child stats
  const { count: parentCount } = await supabase
    .from('legal_chunks')
    .select('*', { count: 'exact', head: true })
    .not('parent_id', 'is', null)
  console.log('Chunks avec parent_id (parent-child):', parentCount)

  // Staging & pending counts
  const { count: stagingCount } = await supabase
    .from('staging_chunks')
    .select('*', { count: 'exact', head: true })
  console.log('staging_chunks total:', stagingCount)

  const { count: pendingCount } = await supabase
    .from('pending_documents')
    .select('*', { count: 'exact', head: true })
  console.log('pending_documents total:', pendingCount)

  const { count: historicalCount } = await supabase
    .from('historical_chunks')
    .select('*', { count: 'exact', head: true })
  console.log('historical_chunks total:', historicalCount)
}

main().catch(console.error)
