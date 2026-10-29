const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { settings: validateSettings } = require('./config');
const { safeExecutable } = require('./discord-games');
const { rank } = require('./ranking');
class ApplicationService {
  constructor(options) {
    Object.assign(this, options); this.catalogReady = false; this.notice = '';
    this.preferences = this.db.read('library', { favorites: [], blacklist: [], selections: {}, custom: [] });
    this.presets = this.db.read('presets', []);
  }
  games() { return [...this.preferences.custom, ...this.catalog.games].map(game => { const selected = this.preferences.selections[game.id] || game.selectedExecutable; return { ...game, selectedExecutable: selected, usable: !!selected, favorite: this.preferences.favorites.includes(game.id), blacklisted: this.preferences.blacklist.includes(game.id) }; }); }
  snapshot() { return { session: this.queue.snapshot(), settings: this.settings, catalog: { source: this.catalog.source, fetchedAt: this.catalog.fetchedAt, error: this.catalog.error, count: this.catalog.games.length, ready: this.catalogReady }, storage: { root: this.storage.root, libraries: this.storage.libraries }, notice: this.notice, historyCount: this.queue.history.length }; }
  async confirm(message, detail) { return (await this.dialog.showMessageBox(this.window(), { type: 'question', message, detail, buttons: ['Cancel', 'Continue'], defaultId: 0, cancelId: 0 })).response === 1; }
  async command(command, args = {}) {
    switch (command) {
      case 'snapshot': return this.snapshot();
      case 'library': return this.games();
      case 'refresh': await this.catalog.load({ refresh: true }); this.catalogReady = true; return this.games();
      case 'history': return this.queue.history;
      case 'presets': return this.presets;
      case 'generate': return this.queue.generate(args, this.games(), args.customIds);
      case 'start': return this.queue.start();
      case 'pause': return this.queue.pause();
      case 'skip': return this.queue.skip();
      case 'stop': return this.queue.stop();
      case 'reset': return this.queue.reset();
      case 'remove': return this.queue.remove(args.key);
      case 'move': return this.queue.move(args.key, args.direction);
      case 'play': {
        const game = this.games().find(g => g.id === args.id);
        if (!game?.usable || game.blacklisted) throw new Error('This game is unavailable or blacklisted.');
        await this.queue.stop(); this.queue.generate({ mode: 'custom', targetCount: 1, interval: this.settings.interval, interGameDelay: 0 }, [game], [game.id]); await this.queue.start(); return true;
      }
      case 'favorite': case 'blacklist': {
        if (!this.games().some(g => g.id === args.id)) throw new Error('Unknown game.');
        const key = command === 'favorite' ? 'favorites' : 'blacklist', list = this.preferences[key]; this.preferences[key] = list.includes(args.id) ? list.filter(id => id !== args.id) : [...list, args.id];
        if (command === 'blacklist' && this.preferences.blacklist.includes(args.id)) for (const item of [...this.queue.state.items]) if (item.game.id === args.id && item.status === 'queued') this.queue.remove(item.key);
        this.db.write('library', this.preferences); return this.games();
      }
      case 'select-executable': {
        const game = this.games().find(g => g.id === args.id);
        if (!game || !safeExecutable(args.name) || !game.executables.some(e => e.name === args.name)) throw new Error('Invalid executable selection.');
        this.preferences.selections[args.id] = args.name; this.db.write('library', this.preferences); return this.games();
      }
      case 'add-custom': {
        if (typeof args.name !== 'string' || !args.name.trim() || args.name.length > 200 || !safeExecutable(args.executable)) throw new Error('Enter a game name and a safe .exe filename.');
        if (args.id && !/^\d{1,24}$/.test(args.id)) throw new Error('Discord application ID must contain digits only.');
        const id = args.id || `custom-${randomUUID()}`; if (this.games().some(g => g.id === id)) throw new Error('That application ID already exists.');
        this.preferences.custom.push({ id, name: args.name.trim(), icon: null, source: 'custom', selectedExecutable: args.executable, executables: [{ name: args.executable, launcher: false }], usable: true, ...rank(args.name) });
        this.db.write('library', this.preferences); return this.games();
      }
      case 'save-preset': {
        if (typeof args.name !== 'string' || !args.name.trim() || args.name.length > 80) throw new Error('Preset name must be 1–80 characters.');
        const { mode, targetCount, interval, interGameDelay, items } = this.queue.state; if (!items.length) throw new Error('Generate a queue before saving a preset.');
        const preset = { name: args.name.trim(), mode, targetCount, interval, interGameDelay, customIds: mode === 'custom' ? items.map(i => i.game.id) : [] };
        this.presets = [...this.presets.filter(p => p.name !== preset.name), preset]; this.db.write('presets', this.presets); return this.presets;
      }
      case 'save-settings': {
        const updated = validateSettings({ ...args, storageParent: this.settings.storageParent }); this.db.write('settings', updated); this.settings = updated;
        if (updated.remoteControl) this.remote.start(); else this.remote.stop(); return this.settings;
      }
      case 'pick-storage': { const result = await this.dialog.showOpenDialog(this.window(), { title: 'Choose parent folder for MyGamesThing/Games', properties: ['openDirectory', 'createDirectory'] }); return result.canceled ? null : result.filePaths[0]; }
      case 'change-storage': {
        if (['running', 'waiting'].includes(this.queue.state.status) || this.queue.processes.active) throw new Error('Pause or stop rotation before changing storage.');
        if (typeof args.parent !== 'string' || (args.parent && !path.isAbsolute(args.parent))) throw new Error('Storage parent must be an absolute path.');
        this.storage.change(args.parent, args.action); this.settings.storageParent = args.parent; this.db.write('settings', this.settings); return this.storage.root;
      }
      case 'open-storage': { const error = await this.shell.openPath(this.storage.root); if (error) throw new Error(error); return; }
      case 'clean': {
        if (this.queue.processes.active || ['running', 'waiting'].includes(this.queue.state.status)) throw new Error('Pause or stop rotation before cleanup.');
        const keep = args.all ? [] : [...this.preferences.favorites, ...this.queue.state.items.filter(i => ['queued', 'paused', 'current'].includes(i.status)).map(i => i.game.id)]; return this.storage.clean(keep);
      }
      case 'clear-history': this.queue.history = []; this.db.write('history', []); return this.queue.history;
      case 'export-history': { const result = await this.dialog.showSaveDialog(this.window(), { defaultPath: 'MyGamesThing-history.json', filters: [{ name: 'JSON', extensions: ['json'] }] }); if (!result.canceled) fs.writeFileSync(result.filePath, JSON.stringify(this.queue.history, null, 2)); return !result.canceled; }
      case 'remote-info': return { token: this.remote.token, http: 'http://127.0.0.1:41235', udp: '127.0.0.1:41234' };
      default: throw new Error('Unknown command.');
    }
  }
}
module.exports = { ApplicationService };
