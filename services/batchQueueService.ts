import { BatchQueueActionType, BatchQueueJob } from '../types';
import { getApiUrl } from './apiConfig';

export interface CreateBatchJobParams {
  action: BatchQueueActionType;
  label?: string;
  concurrency?: number;
  delayMs?: number;
  verifyWake?: boolean;
  verifyDelaySec?: number;
  targets: Array<{
    ip: string;
    mac?: string;
    hostname?: string;
    port?: number;
    protocol?: string;
  }>;
}

export async function listBatchJobs(): Promise<BatchQueueJob[]> {
  try {
    const res = await fetch(getApiUrl('/api/batch-queue/jobs'), { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.jobs) ? data.jobs : [];
  } catch {
    return [];
  }
}

export async function getBatchJob(jobId: string): Promise<BatchQueueJob | null> {
  try {
    const res = await fetch(getApiUrl(`/api/batch-queue/jobs/${encodeURIComponent(jobId)}`), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.job || null;
  } catch {
    return null;
  }
}

export async function createBatchJob(params: CreateBatchJobParams): Promise<BatchQueueJob> {
  const res = await fetch(getApiUrl('/api/batch-queue/jobs'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.job) {
    throw new Error(data?.error || `HTTP ${res.status} — Failed to start batch queue job`);
  }
  return data.job as BatchQueueJob;
}

export async function cancelBatchJob(jobId: string): Promise<BatchQueueJob | null> {
  const res = await fetch(getApiUrl(`/api/batch-queue/jobs/${encodeURIComponent(jobId)}/cancel`), {
    method: 'POST',
  });
  const data = await res.json().catch(() => null);
  return data?.job || null;
}

export async function retryBatchJob(jobId: string): Promise<BatchQueueJob> {
  const res = await fetch(getApiUrl(`/api/batch-queue/jobs/${encodeURIComponent(jobId)}/retry`), {
    method: 'POST',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success || !data?.job) {
    throw new Error(data?.error || 'Failed to retry failed batch targets');
  }
  return data.job as BatchQueueJob;
}
