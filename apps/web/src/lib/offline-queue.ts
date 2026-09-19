/**
 * Offline text-visit queue — IndexedDB (never localStorage; visit payloads
 * can be large and this data must survive a tab crash reliably).
 *
 * Flow (per docs/DESIGN.md / product spec):
 *   CHW enters text visit while offline
 *     -> saved to IndexedDB, status SAVED_LOCALLY
 *     -> connectivity returns -> PENDING_SYNC -> SYNCING
 *     -> POST /api/v1/visits (backend runs AI structuring)
 *     -> SYNCED
 *   A failed sync attempt sets SYNC_FAILED; retry re-attempts the same
 *   clientGeneratedId, so a retry can never create a duplicate visit
 *   (backend upserts on (organizationId, clientGeneratedId)).
 *
 * Scope: TEXT visits only. Audio is not queued offline in the MVP — STT/AI
 * processing only ever happens once a visit reaches the backend; there is no
 * offline AI.
 */
import * as visitsService from '@/services/visits.service';
import { ApiError } from './api';

export type QueuedVisitStatus =
  | 'SAVED_LOCALLY'
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCED'
  | 'SYNC_FAILED';

export interface QueuedVisit {
  clientGeneratedId: string;
  patientId: string;
  transcript: string;
  visitedAt: string;
  status: QueuedVisitStatus;
  createdAt: string;
  lastError?: string;
}

const DB_NAME = 'carenest-offline';
const STORE = 'visits';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientGeneratedId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open offline database'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const req = fn(store);
    tx.oncomplete = () => resolve(req ? (req as IDBRequest<T>).result : (undefined as T));
    tx.onerror = () => reject(tx.error ?? new Error('Offline database transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('Offline database transaction aborted'));
  });
}

export async function queueOfflineVisit(input: {
  clientGeneratedId: string;
  patientId: string;
  transcript: string;
  visitedAt: string;
}): Promise<QueuedVisit> {
  const record: QueuedVisit = {
    ...input,
    status: 'SAVED_LOCALLY',
    createdAt: new Date().toISOString(),
  };
  await withStore('readwrite', (store) => store.put(record));
  return record;
}

export async function listQueuedVisits(): Promise<QueuedVisit[]> {
  try {
    return await withStore<QueuedVisit[]>('readonly', (store) => store.getAll());
  } catch {
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  const all = await listQueuedVisits();
  return all.filter((v) => v.status !== 'SYNCED').length;
}

async function updateStatus(
  clientGeneratedId: string,
  status: QueuedVisitStatus,
  lastError?: string,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(clientGeneratedId);
    getReq.onsuccess = () => {
      const existing = getReq.result as QueuedVisit | undefined;
      if (existing) {
        store.put({ ...existing, status, lastError });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Attempts to sync every not-yet-synced queued visit. Safe to call
 * repeatedly (e.g. on every reconnect) — each attempt reuses the same
 * clientGeneratedId, so the backend's idempotent upsert prevents duplicates
 * even if a previous attempt actually succeeded but the response was lost.
 */
export async function syncQueuedVisits(): Promise<{ synced: number; failed: number }> {
  const queued = (await listQueuedVisits()).filter((v) => v.status !== 'SYNCED' && v.status !== 'SYNCING');
  let synced = 0;
  let failed = 0;

  for (const visit of queued) {
    await updateStatus(visit.clientGeneratedId, 'SYNCING');
    try {
      await visitsService.createTextVisit({
        patientId: visit.patientId,
        transcript: visit.transcript,
        visitedAt: visit.visitedAt,
        clientGeneratedId: visit.clientGeneratedId,
      });
      await updateStatus(visit.clientGeneratedId, 'SYNCED');
      synced += 1;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sync failed. Will retry.';
      await updateStatus(visit.clientGeneratedId, 'SYNC_FAILED', message);
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function retryQueuedVisit(clientGeneratedId: string): Promise<void> {
  const queued = await listQueuedVisits();
  const visit = queued.find((v) => v.clientGeneratedId === clientGeneratedId);
  if (!visit) return;

  await updateStatus(clientGeneratedId, 'SYNCING');
  try {
    await visitsService.createTextVisit({
      patientId: visit.patientId,
      transcript: visit.transcript,
      visitedAt: visit.visitedAt,
      clientGeneratedId: visit.clientGeneratedId,
    });
    await updateStatus(clientGeneratedId, 'SYNCED');
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Sync failed. Will retry.';
    await updateStatus(clientGeneratedId, 'SYNC_FAILED', message);
  }
}

export async function clearSyncedVisits(): Promise<void> {
  const all = await listQueuedVisits();
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const v of all) {
    if (v.status === 'SYNCED') store.delete(v.clientGeneratedId);
  }
}
