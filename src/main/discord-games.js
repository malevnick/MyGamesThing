const path = require('node:path');
const { rank } = require('./ranking');
const BAD_EXE = /launcher|crash|helper|redist|uninstall|dedicated|server|updater|setup/i;
const RESERVED = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
function safeExecutable(name) {
  return typeof name === 'string' && name.length <= 120 && /\.exe$/i.test(name) &&
    !/[<>:"/\\|?*\x00-\x1f]/.test(name) && !RESERVED.test(name) && !/[ .]$/.test(name) && name !== '.exe';
}
function normalizeGame(raw) {
  if (!raw || !/^\d{1,24}$/.test(String(raw.id)) || typeof raw.name !== 'string') return null;
  const executables = (Array.isArray(raw.executables) ? raw.executables : []).filter(e => e && e.os === 'win32' && typeof e.name === 'string').map(e => ({ name: path.win32.basename(e.name), original: e.name, launcher: !!e.is_launcher })).filter(e => safeExecutable(e.name));
  if (!executables.length) return null;
  const candidates = executables.filter(e => !e.launcher && !BAD_EXE.test(e.name)).sort((a, b) => a.name.length - b.name.length);
  return { id: String(raw.id), name: raw.name.slice(0, 200), icon: typeof raw.icon === 'string' && /^[a-zA-Z0-9_]+$/.test(raw.icon) ? raw.icon : null, executables, selectedExecutable: candidates[0]?.name || null, usable: !!candidates.length, source: 'discord', ...rank(raw.name) };
}
class DiscordGames {
  constructor(db, fetcher) { this.db = db; this.fetcher = fetcher; this.games = []; this.source = 'unavailable'; this.error = ''; this.fetchedAt = null; }
  readCache() {
    const cache = this.db.read('catalog', { games: [], fetchedAt: null });
    const games = (Array.isArray(cache?.games) ? cache.games : []).filter(g => g && typeof g.id === 'string' && typeof g.name === 'string' && Array.isArray(g.executables) && (!g.selectedExecutable || safeExecutable(g.selectedExecutable)));
    if (!games.length) return false;
    this.games = games; this.fetchedAt = cache.fetchedAt; this.source = 'cached'; this.error = '';
    return true;
  }
  async load({ refresh = false } = {}) {
    if (!refresh && this.readCache()) {
      this.db.log('catalog.local', { count: this.games.length, fetchedAt: this.fetchedAt });
      return this.games;
    }
    if (this.pending) return this.pending;
    this.pending = this.fetchRemote();
    try { return await this.pending; } finally { this.pending = null; }
  }
  async fetchRemote() {
    try {
      const response = await this.fetcher('https://discord.com/api/v9/applications/detectable', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Discord returned HTTP ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw)) throw new Error('Unexpected Discord response.');
      const games = [];
      for (let offset = 0; offset < raw.length; offset += 100) {
        games.push(...raw.slice(offset, offset + 100).map(normalizeGame).filter(Boolean));
        await new Promise(resolve => setImmediate(resolve));
      }
      if (!games.length) throw new Error('Discord returned no usable Windows entries.');
      this.games = [...new Map(games.map(g => [g.id, g])).values()];
      this.fetchedAt = Date.now(); this.source = 'live'; this.error = '';
      this.db.write('catalog', { games: this.games, fetchedAt: this.fetchedAt });
    } catch (error) {
      this.readCache();
      this.source = this.games.length ? 'cached' : 'unavailable'; this.error = error.message;
    }
    this.db.log('catalog.load', { source: this.source, count: this.games.length, error: this.error });
    return this.games;
  }
}
module.exports = { DiscordGames, normalizeGame, safeExecutable, RESERVED };
