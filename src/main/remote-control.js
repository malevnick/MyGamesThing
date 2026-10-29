const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const dgram = require('node:dgram');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { normalize } = require('./ranking');
class RemoteControl {
  constructor(service, serial, db) { this.service = service; this.serial = serial; this.db = db; this.token = db.read('remote-token', '') || randomBytes(24).toString('hex'); db.write('remote-token', this.token); }
  authenticated(value) { const a = Buffer.from(String(value || '')), b = Buffer.from(this.token); return a.length === b.length && timingSafeEqual(a, b); }
  async action(data) {
    if (!this.authenticated(data.token)) throw new Error('Unauthorized');
    return this.serial(async () => {
      if (data.action === 'status') return { success: true, playing: this.service.queue.current()?.status === 'current' ? this.service.queue.current().game.name : null };
      if (data.action === 'stop') { await this.service.queue.stop(); return { success: true }; }
      if (data.action === 'play') {
        const game = this.service.games().find(g => normalize(g.name) === normalize(data.game));
        if (!game?.usable || game.blacklisted) throw new Error('Game unavailable.');
        if (['running', 'waiting', 'paused'].includes(this.service.queue.state.status)) throw new Error('Stop the existing session first.');
        await this.service.command('play', { id: game.id }); return { success: true, game: game.name };
      }
      throw new Error('Unknown action');
    });
  }
  start() {
    if (this.server) return;
    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const assets = { '/': ['index.html', 'text/html'], '/controller.js': ['controller.js', 'text/javascript'], '/controller.css': ['controller.css', 'text/css'] };
      if (assets[url.pathname]) { const [file, type] = assets[url.pathname]; res.setHeader('Content-Type', type); res.end(fs.readFileSync(path.join(__dirname, '../../companion', file))); return; }
      res.setHeader('Content-Type', 'application/json');
      try { const result = await this.action({ action: url.pathname.slice(1), game: url.searchParams.get('game'), token: req.headers.authorization?.replace(/^Bearer /, '') }); res.end(JSON.stringify(result)); }
      catch (error) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: error.message })); }
    });
    this.server.on('error', error => this.db.log('remote.http.error', { error: error.message })); this.server.listen(41235, '127.0.0.1');
    this.udp = dgram.createSocket('udp4'); this.udp.on('error', error => this.db.log('remote.udp.error', { error: error.message }));
    this.udp.on('message', async (message, peer) => { if (message.length > 8192) return; let result; try { result = await this.action(JSON.parse(message.toString())); } catch (error) { result = { success: false, error: error.message }; } this.udp?.send(Buffer.from(JSON.stringify(result)), peer.port, peer.address); });
    this.udp.bind(41234, '127.0.0.1'); this.db.log('remote.start');
  }
  stop() { this.server?.close(); this.server = null; try { this.udp?.close(); } catch {} this.udp = null; }
}
module.exports = { RemoteControl };
