import type { ChunkGeometryData } from '../domain/world';

interface PendingRequest {
  resolve: (data: ChunkGeometryData) => void;
  reject: (error: Error) => void;
}

interface ChunkWorkerResponse {
  id: number;
  data?: ChunkGeometryData;
  error?: string;
}

let worker: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<number, PendingRequest>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('../workers/chunk.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<ChunkWorkerResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.error) request.reject(new Error(event.data.error));
    else if (event.data.data) request.resolve(event.data.data);
    else request.reject(new Error('O worker retornou uma malha vazia.'));
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || 'O worker de chunks foi interrompido.');
    pending.forEach((request) => request.reject(error));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function requestChunkGeometry(
  chunkX: number,
  chunkZ: number,
  seed: number,
  edits: Record<string, string>,
  structures: boolean
): Promise<ChunkGeometryData> {
  const id = nextRequestId;
  nextRequestId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      getWorker().postMessage({ id, chunkX, chunkZ, seed, edits, structures });
    } catch (error) {
      pending.delete(id);
      reject(error instanceof Error ? error : new Error('Não foi possível iniciar o worker de chunks.'));
    }
  });
}
