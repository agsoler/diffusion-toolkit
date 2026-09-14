import { NextResponse } from 'next/server';
import { recordResults, readResults, forgottenRoundIds } from '@/server/comparisonLedger';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json({ results: await readResults(), forgottenRoundIds: await forgottenRoundIds() }); }
  catch { return NextResponse.json({ error: 'Unable to read comparison ledger' }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.results) || body.results.length > 500 || JSON.stringify(body).length > 4000000) {
      return NextResponse.json({ error: 'Invalid comparison records' }, { status: 400 });
    }
    await recordResults(body.results);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Unable to save comparison records' }, { status: 500 }); }
}
