import { apiClient } from '@/utils/api';

// Bound individual requests, not the number of trials in an evaluation.
export async function saveComparisonHistory(results: any[]) {
  const records = results.filter(r => r.generation).map(r => ({ ...r, historical: r.historical ?? !r.round }));
  let batch: any[] = [];
  let size = 20;
  for (const record of records) {
    const length = JSON.stringify(record).length + 1;
    if (batch.length && (batch.length >= 100 || size + length > 3500000)) {
      await apiClient.post('/api/comparison-ledger', { results: batch });
      batch = [];
      size = 20;
    }
    batch.push(record);
    size += length;
  }
  if (batch.length) await apiClient.post('/api/comparison-ledger', { results: batch });
}
