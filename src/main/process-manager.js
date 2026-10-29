const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const { within, noLinks } = require('./storage-manager');
const exec = promisify(execFile);
class ProcessManager {
  constructor(db, storage) { this.db = db; this.storage = storage; this.active = null; }
  async recover() {
    const record = this.db.read('process', null);
    if (!record) return;
    if (!Number.isInteger(record.pid) || record.pid <= 0 || !record.root || !within(record.root, record.path)) throw new Error('Invalid stale process record.');
    this.storage.ensureRoot(record.root); noLinks(record.path);
    if (process.platform === 'win32') {
      // Match PID AND full executable path, preventing termination of a reused PID.
      const script = `$p = Get-CimInstance Win32_Process -Filter 'ProcessId = ${record.pid}'; if ($p) { if (-not $p.ExecutablePath) { throw 'Cannot verify stale process path' }; if ($p.ExecutablePath -ieq $env:MGT_PROCESS_PATH) { Stop-Process -Id ${record.pid} -Force -ErrorAction Stop } }`;
      await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 15000, env: { ...process.env, MGT_PROCESS_PATH: record.path } });
    }
    this.db.write('process', null); this.db.log('process.recovery', record);
  }
  async launch(game) {
    if (this.active) throw new Error('A generated process is already active.');
    const target = this.storage.prepare(game);
    const child = spawn(target, ['--title', game.name], { cwd: path.dirname(target), detached: false, windowsHide: true, stdio: 'ignore' });
    const active = { child, pid: child.pid, path: target, gameId: game.id, exited: false, intentional: false };
    child.once('exit', (code, signal) => { active.exited = true; active.exitCode = code; this.db.log('process.exit', { pid: active.pid, code, signal, intentional: active.intentional }); });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    active.pid = child.pid; this.active = active;
    try { this.db.write('process', { pid: child.pid, path: target, root: this.storage.root, gameId: game.id, startedAt: Date.now() }); }
    catch (error) { await this.stop(); throw error; }
    this.db.log('process.launch', { pid: child.pid, path: target, gameId: game.id });
    return { pid: child.pid, path: target };
  }
  async stop() {
    const active = this.active;
    if (!active) return;
    active.intentional = true;
    if (!active.exited) {
      const exited = new Promise(resolve => active.child.once('exit', resolve));
      active.child.kill();
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))]);
      if (!active.exited) throw new Error(`Process ${active.pid} did not stop; generated files remain protected.`);
    }
    this.active = null; this.db.write('process', null);
    this.db.log('process.stop', { pid: active.pid, path: active.path });
  }
}
module.exports = { ProcessManager };
