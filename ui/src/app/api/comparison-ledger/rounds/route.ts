import { NextResponse } from 'next/server';
import path from 'path';
import prisma from '@/server/prisma';
import { getTrainingFolder } from '@/server/settings';
import { deleteComparisonRounds } from '@/server/deleteComparisonRounds';
import { listEngines } from '@/server/inferenceEngine';

export async function POST(request: Request) {
  try {
    const { roundIds, folder, encoder } = await request.json();
    if (!Array.isArray(roundIds) || !roundIds.length || roundIds.length > 500 ||
      roundIds.some(id => typeof id !== 'string' || !id || id.length > 200) ||
      typeof folder !== 'string' || !folder || !(encoder === null || typeof encoder === 'string')) {
      return NextResponse.json({ error: 'Invalid round deletion request' }, { status: 400 });
    }
    for (const engine of await listEngines(true)) {
      if (!engine.endpoint) return NextResponse.json({ error: 'Wait for the inference engine to finish starting or stopping.' }, { status: 409 });
      const response = await fetch(`http://127.0.0.1:${engine.endpoint.port}/health`, { headers: { 'x-engine-token': engine.endpoint.token }, signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (!response.ok) throw Error('Cannot verify idle engine');
      const health = await response.json();
      if (health.busy || health.queue) return NextResponse.json({ error: 'Wait for generation to finish before deleting rounds.' }, { status: 409 });
    }
    const training = await getTrainingFolder();
    const jobs = await prisma.job.findMany({ where: { job_type: 'inference' }, select: { name: true } });
    return NextResponse.json(await deleteComparisonRounds(roundIds, folder, encoder, jobs.map(j => path.join(training, j.name, 'outputs'))));
  } catch {
    return NextResponse.json({ error: 'Round deletion failed. Refresh and retry; history is retained for unfinished rounds.' }, { status: 500 });
  }
}
