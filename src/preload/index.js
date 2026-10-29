const { contextBridge, ipcRenderer } = require('electron');
const commands = new Set(['snapshot', 'library', 'refresh', 'history', 'presets', 'generate', 'start', 'pause', 'skip', 'stop', 'reset', 'remove', 'move', 'play', 'favorite', 'blacklist', 'select-executable', 'add-custom', 'save-preset', 'save-settings', 'pick-storage', 'change-storage', 'open-storage', 'clean', 'clear-history', 'export-history', 'remote-info']);
contextBridge.exposeInMainWorld('mgt', {
  command: async (name, args) => { if (!commands.has(name)) throw new Error('Unknown command'); const result = await ipcRenderer.invoke('mgt:command', name, args); if (!result.ok) throw new Error(result.error); return result.value; },
  onState: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('mgt:state', listener); return () => ipcRenderer.removeListener('mgt:state', listener); },
  onCatalog: callback => { const listener = () => callback(); ipcRenderer.on('mgt:catalog', listener); return () => ipcRenderer.removeListener('mgt:catalog', listener); },
  onError: callback => { const listener = (_event, message) => callback(message); ipcRenderer.on('mgt:error', listener); return () => ipcRenderer.removeListener('mgt:error', listener); },
});
