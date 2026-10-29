const { EventEmitter } = require('node:events');
const { randomUUID } = require('node:crypto');
const { interval, number } = require('./config');
function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const empty = () => ({ id: null, status: 'idle', mode: 'popular', items: [], index: 0, targetCount: 25, interval: { type: 'fixed', fixed: 90, min: 60, max: 120 }, interGameDelay: 2, endAt: null, waitUntil: null, createdAt: null, updatedAt: null, recovered: false });
class QueueManager extends EventEmitter {
  constructor(db, processes, now = Date.now, random = Math.random) {
    super(); this.db = db; this.processes = processes; this.now = now; this.random = random;
    this.state = db.read('session', empty()); this.history = db.read('history', []); this.lastCheckpoint = 0;
    if (!Array.isArray(this.state.items)) this.state = empty();
    const recorded = new Map(this.history.map(entry => [entry.id, entry]));
    for (const item of this.state.items) {
      const entry = recorded.get(item.key);
      if (entry && ['current', 'paused', 'queued'].includes(item.status)) { item.status = entry.result; item.elapsedMs = entry.durationMs; item.endedAt = entry.endTime; }
    }
    while (this.current() && ['completed', 'failed', 'skipped', 'stopped'].includes(this.current().status)) this.state.index++;
    if (['running', 'waiting', 'paused'].includes(this.state.status)) {
      const current = this.current();
      if (current?.status === 'current') { current.status = 'paused'; current.runStartedAt = null; }
      this.state.status = 'paused'; this.state.endAt = null; this.state.waitUntil = null; this.state.recovered = true;
      this.db.log('session.recovery', { index: this.state.index, count: this.state.items.length }); this.save();
    }
  }
  current() { return this.state.items[this.state.index]; }
  snapshot() {
    const s = structuredClone(this.state), item = s.items[s.index];
    if (item?.status === 'current') {
      const delta = Math.max(0, this.now() - item.runStartedAt);
      item.elapsedMs = Math.min(item.durationMs, item.elapsedMs + delta);
      item.remainingMs = Math.max(0, s.endAt - this.now());
    }
    const remaining = s.items.filter(i => ['queued', 'current', 'paused'].includes(i.status));
    s.remainingCount = remaining.length;
    s.completedCount = s.items.filter(i => i.status === 'completed').length;
    s.processedCount = s.items.filter(i => ['completed', 'failed', 'skipped', 'stopped'].includes(i.status)).length;
    s.estimatedMs = remaining.reduce((sum, i) => sum + (i.remainingMs ?? i.durationMs), 0) + Math.max(0, remaining.length - 1) * s.interGameDelay * 1000;
    if (s.status === 'waiting') s.estimatedMs += Math.max(0, s.waitUntil - this.now());
    return s;
  }
  save() {
    this.state.updatedAt = this.now();
    this.db.write('session', this.snapshot()); this.emit('change');
  }
  generate(config, pool, customIds = []) {
    if (['running', 'waiting', 'paused'].includes(this.state.status)) throw new Error('Stop the existing session before replacing the queue.');
    if (!['popular', 'random', 'custom'].includes(config.mode)) throw new Error('Invalid mode.');
    const count = number(config.targetCount, 1, Number.MAX_SAFE_INTEGER, 'Target count');
    if (!Number.isInteger(count)) throw new Error('Target count must be a whole number.');
    const timing = interval(config.interval), delay = number(config.interGameDelay, 0, 3600, 'Inter-game delay');
    let games = [...new Map(pool.filter(g => g.usable && !g.blacklisted).map(g => [g.id, g])).values()];
    if (config.mode === 'custom') {
      if (!Array.isArray(customIds)) throw new Error('Invalid custom selection.');
      const byId = new Map(games.map(g => [g.id, g])); games = [...new Set(customIds)].map(id => byId.get(id)).filter(Boolean);
    } else if (config.mode === 'random') games = shuffle(games, this.random);
    else games.sort((a, b) => a.tier.localeCompare(b.tier) || a.rank - b.rank || a.name.localeCompare(b.name));
    if (!games.length) throw new Error('No usable games in this selection. Add games or change your filters.');
    this.state = { ...empty(), id: randomUUID(), status: 'ready', mode: config.mode, targetCount: count, interval: timing, interGameDelay: delay, createdAt: this.now(), items: games.slice(0, count).map(game => {
      const durationMs = Math.round((timing.type === 'fixed' ? timing.fixed : timing.min + this.random() * (timing.max - timing.min)) * 1000);
      return { key: randomUUID(), game: structuredClone(game), status: 'queued', durationMs, remainingMs: durationMs, elapsedMs: 0, startedAt: null, runStartedAt: null, generatedPath: null, error: null };
    }) };
    this.db.log('queue.generate', { mode: config.mode, requested: count, actual: this.state.items.length }); this.save();
  }
  async start() {
    if (!['ready', 'paused'].includes(this.state.status)) throw new Error('Generate a queue or resume a paused session.');
    this.state.recovered = false;
    await this.launchNext();
  }
  async launchNext() {
    while (this.state.index < this.state.items.length) {
      const item = this.current();
      if (!['queued', 'paused'].includes(item.status)) { this.state.index++; continue; }
      try {
        const launched = await this.processes.launch(item.game);
        item.generatedPath = launched.path; item.startedAt ??= this.now(); item.runStartedAt = this.now(); item.status = 'current';
        this.state.status = 'running'; this.state.endAt = this.now() + item.remainingMs; this.state.waitUntil = null; this.save(); return;
      } catch (error) {
        if (this.processes.active) throw error;
        item.error = error.message; this.db.log('queue.launch.error', { game: item.game.id, error: error.message });
        this.record(item, 'failed'); this.state.index++; this.save();
      }
    }
    this.state.status = 'finished'; this.state.endAt = null; this.state.waitUntil = null; this.save();
  }
  accumulate() {
    const item = this.current();
    if (item?.status === 'current') {
      item.elapsedMs = Math.min(item.durationMs, item.elapsedMs + Math.max(0, this.now() - item.runStartedAt));
      item.remainingMs = Math.max(0, this.state.endAt - this.now()); item.runStartedAt = null;
    }
  }
  record(item, result) {
    item.status = result; item.endedAt = this.now(); item.runStartedAt = null;
    const entry = { id: item.key, sessionId: this.state.id, gameName: item.game.name, applicationId: item.game.id, executable: item.game.selectedExecutable, generatedPath: item.generatedPath, startTime: item.startedAt, endTime: item.endedAt, durationMs: item.elapsedMs, result, error: item.error };
    // Idempotent finalization across a crash between history and session writes.
    this.history = this.history.filter(h => h.id !== entry.id); this.history.push(entry); this.db.write('history', this.history);
  }
  async finishCurrent(result, error = null) {
    await this.processes.stop(); this.accumulate();
    const item = this.current();
    if (item) { item.error = error; this.record(item, result); }
    this.state.index++; this.state.endAt = null;
    if (this.state.index >= this.state.items.length) { this.state.status = 'finished'; this.state.waitUntil = null; }
    else { this.state.status = 'waiting'; this.state.waitUntil = this.now() + this.state.interGameDelay * 1000; }
    this.save();
  }
  async tick() {
    if (this.state.status === 'running') {
      if (this.processes.active?.exited) await this.finishCurrent('failed', 'Generated process exited before its interval ended.');
      else if (this.now() >= this.state.endAt) await this.finishCurrent('completed');
      else if (this.now() - this.lastCheckpoint >= 5000) { this.lastCheckpoint = this.now(); this.save(); }
    }
    if (this.state.status === 'waiting' && this.now() >= this.state.waitUntil) await this.launchNext();
  }
  async pause() {
    if (!['running', 'waiting'].includes(this.state.status)) return;
    await this.processes.stop(); this.accumulate();
    if (this.current()?.status === 'current') this.current().status = 'paused';
    this.state.status = 'paused'; this.state.endAt = null; this.state.waitUntil = null; this.save();
  }
  async skip() {
    if (!['running', 'waiting', 'paused'].includes(this.state.status)) throw new Error('There is no active session.');
    const paused = this.state.status === 'paused';
    await this.finishCurrent('skipped');
    if (paused && this.state.status !== 'finished') { this.state.status = 'paused'; this.state.waitUntil = null; this.save(); }
  }
  async stop() {
    await this.processes.stop(); this.accumulate();
    if (['current', 'paused'].includes(this.current()?.status)) this.record(this.current(), 'stopped');
    this.state.status = 'stopped'; this.state.endAt = null; this.state.waitUntil = null; this.state.recovered = false; this.save();
  }
  reset() {
    if (['running', 'waiting', 'paused'].includes(this.state.status)) throw new Error('Stop the session before resetting it.');
    this.state = empty(); this.save();
  }
  remove(key) {
    const index = this.state.items.findIndex(i => i.key === key);
    if (index < 0 || this.state.items[index].status !== 'queued') throw new Error('Only queued games can be removed.');
    this.state.items.splice(index, 1); if (index < this.state.index) this.state.index--;
    if (!this.current() && this.state.status === 'waiting') this.state.status = 'finished';
    this.save();
  }
  move(key, direction) {
    if (this.state.mode !== 'custom' || ![-1, 1].includes(direction)) throw new Error('Only custom queues can be reordered.');
    const index = this.state.items.findIndex(i => i.key === key), next = index + direction;
    if (this.state.items[index]?.status !== 'queued' || this.state.items[next]?.status !== 'queued') return;
    [this.state.items[index], this.state.items[next]] = [this.state.items[next], this.state.items[index]]; this.save();
  }
}
module.exports = { QueueManager, shuffle };
