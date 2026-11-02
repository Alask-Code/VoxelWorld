import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { createWorldStorage } from './worldStorage';
import type { StoredWorld, WorldSnapshot } from '../src/domain/world';

function assertTrustedSender(event: IpcMainInvokeEvent, window: BrowserWindow) {
  const url = event.senderFrame?.url ?? '';
  const trusted = url.startsWith('file://') || /^http:\/\/localhost:3000(?:\/|$)/.test(url);
  if (event.sender !== window.webContents || !trusted) throw new Error('Origem IPC não autorizada.');
}

function assertWorldPayload(value: unknown): asserts value is StoredWorld {
  if (!value || typeof value !== 'object') throw new Error('Payload de mundo inválido.');
  const world = value as StoredWorld;
  if (
    !world.manifest ||
    typeof world.manifest.id !== 'string' ||
    !world.snapshot ||
    !Array.isArray(world.snapshot.inventory) ||
    !world.snapshot.blockEdits
  ) {
    throw new Error('Payload de mundo inválido.');
  }
}

function assertId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Identificador de mundo inválido.');
  }
}

export default function registerIpcMain(window: BrowserWindow) {
  const storage = createWorldStorage(join(app.getPath('userData'), 'worlds'));
  const handle = (channel: string, callback: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => {
    ipcMain.handle(channel, (event, ...args) => {
      assertTrustedSender(event, window);
      return callback(event, ...args);
    });
  };

  handle('worlds:list', () => storage.list());
  handle('worlds:create', (_event, value) => {
    assertWorldPayload(value);
    return storage.create(value);
  });
  handle('worlds:load', (_event, id) => {
    assertId(id);
    return storage.load(id);
  });
  handle('worlds:save', (_event, id, snapshot) => {
    assertId(id);
    if (!snapshot || typeof snapshot !== 'object') throw new Error('Snapshot de mundo inválido.');
    return storage.save(id, snapshot as WorldSnapshot);
  });
  handle('worlds:rename', (_event, id, name) => {
    assertId(id);
    if (typeof name !== 'string') throw new Error('Nome de mundo inválido.');
    return storage.rename(id, name);
  });
  handle('worlds:delete', (_event, id) => {
    assertId(id);
    return storage.remove(id);
  });
  handle('app:close', () => window.close());
}
