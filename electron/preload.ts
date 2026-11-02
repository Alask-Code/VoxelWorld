import { contextBridge, ipcRenderer } from 'electron';
import type { GameWorldApi } from '../src/types/global';

const gameApi: GameWorldApi = {
  listWorlds: () => ipcRenderer.invoke('worlds:list'),
  createWorld: (world) => ipcRenderer.invoke('worlds:create', world),
  loadWorld: (id) => ipcRenderer.invoke('worlds:load', id),
  saveWorld: (id, snapshot) => ipcRenderer.invoke('worlds:save', id, snapshot),
  renameWorld: (id, name) => ipcRenderer.invoke('worlds:rename', id, name),
  deleteWorld: (id) => ipcRenderer.invoke('worlds:delete', id),
  closeApp: () => ipcRenderer.invoke('app:close')
};

contextBridge.exposeInMainWorld('gameApi', gameApi);
