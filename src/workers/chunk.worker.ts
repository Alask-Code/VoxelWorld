import { createChunkGeometryData } from '../domain/world';

interface ChunkRequest {
  id: number;
  chunkX: number;
  chunkZ: number;
  seed: number;
  edits: Record<string, string>;
  structures: boolean;
}

self.onmessage = (event: MessageEvent<ChunkRequest>) => {
  const request = event.data;
  try {
    const data = createChunkGeometryData(
      request.chunkX,
      request.chunkZ,
      request.seed,
      request.edits,
      request.structures
    );
    self.postMessage({ id: request.id, data });
  } catch (error) {
    self.postMessage({
      id: request.id,
      error: error instanceof Error ? error.message : 'Falha ao gerar a malha do chunk.'
    });
  }
};
