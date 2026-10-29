const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const { safeExecutable, RESERVED } = require('./discord-games');
const OWNER = 'MyGamesThing-generated-v1';
function sanitize(name) {
  let value = String(name).normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/g, '').slice(0, 65).replace(/[ .]+$/g, '');
  if (!value || RESERVED.test(value)) value = `_${value || 'Game'}`;
  return value;
}
function within(root, candidate) {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel !== '' && !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel);
}
function noLinks(target) {
  let current = path.resolve(target);
  for (;;) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Linked storage directories are not supported: ${current}`);
    const parent = path.dirname(current); if (parent === current) break; current = parent;
  }
}
function parseLibraries(text) {
  return [...text.matchAll(/"path"\s+"((?:\\.|[^"\\])*)"/g)].map(m => m[1].replace(/\\\\/g, '\\'));
}
class StorageManager {
  constructor(db, fallback, runner) { this.db = db; this.fallback = fallback; this.runner = runner; this.libraries = []; this.root = ''; }
  async discover() {
    const candidates = [];
    if (process.platform === 'win32') {
      for (const [key, value] of [['HKCU\\Software\\Valve\\Steam', 'SteamPath'], ['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath']]) {
        try { const { stdout } = await exec('reg.exe', ['query', key, '/v', value], { windowsHide: true, timeout: 5000 }); const match = stdout.match(/REG_SZ\s+(.+)/); if (match) candidates.push(match[1].trim()); } catch {}
      }
    }
    candidates.push(path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'), path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Steam'));
    for (const steam of [...candidates]) {
      try { candidates.push(...parseLibraries(fs.readFileSync(path.join(steam, 'steamapps', 'libraryfolders.vdf'), 'utf8'))); } catch {}
    }
    this.libraries = [...new Map(candidates.map(p => path.resolve(p)).map(p => [p.toLowerCase(), p])).values()].filter(p => fs.existsSync(path.join(p, 'steamapps')));
    this.db.log('storage.steam.discovery', { libraries: this.libraries });
    return this.libraries;
  }
  resolve(parent = '') {
    return path.resolve(parent || (this.libraries[0] ? path.join(this.libraries[0], 'steamapps', 'common') : this.fallback), 'MyGamesThing', 'Games');
  }
  initialize(parent) {
    const desired = this.resolve(parent);
    try { this.ensureRoot(desired); this.root = desired; }
    catch (error) {
      if (parent) throw error;
      this.root = path.resolve(this.fallback, 'MyGamesThing', 'Games'); this.ensureRoot(this.root);
      this.db.log('storage.fallback', { error: error.message });
    }
    this.db.log('storage.root', { root: this.root });
  }
  ensureRoot(root) {
    noLinks(root);
    const marker = path.join(root, '.mygamesthing.json');
    if (fs.existsSync(root) && !fs.existsSync(marker) && fs.readdirSync(root).length) throw new Error('Storage directory is not owned by MyGamesThing. Choose another parent folder.');
    fs.mkdirSync(root, { recursive: true });
    if (fs.existsSync(marker)) {
      if (JSON.parse(fs.readFileSync(marker, 'utf8')).owner !== OWNER) throw new Error('Storage ownership marker does not match.');
    } else fs.writeFileSync(marker, JSON.stringify({ owner: OWNER, createdAt: Date.now() }), { flag: 'wx' });
  }
  gamePath(game, root = this.root) {
    if (!safeExecutable(game.selectedExecutable)) throw new Error('Invalid or missing executable filename.');
    const suffix = crypto.createHash('sha256').update(String(game.id)).digest('hex').slice(0, 10);
    const dir = path.join(root, `${sanitize(game.name)}--${suffix}`);
    const target = path.join(dir, game.selectedExecutable);
    if (!within(root, target) || target.length > 240) throw new Error('Generated path is too long or outside storage. Choose a shorter storage location.');
    noLinks(target);
    return target;
  }
  prepare(game) {
    this.ensureRoot(this.root);
    const target = this.gamePath(game), dir = path.dirname(target), marker = path.join(dir, '.generated.json');
    if (fs.existsSync(dir) && !fs.existsSync(marker) && fs.readdirSync(dir).length) throw new Error('Game directory contains files not owned by MyGamesThing.');
    fs.mkdirSync(dir, { recursive: true });
    let manifest = { owner: OWNER, id: game.id, files: [] };
    if (fs.existsSync(marker)) manifest = JSON.parse(fs.readFileSync(marker, 'utf8'));
    if (manifest.owner !== OWNER || manifest.id !== game.id || !Array.isArray(manifest.files)) throw new Error('Game ownership mismatch.');
    if (fs.existsSync(target) && !manifest.files.includes(game.selectedExecutable)) throw new Error('Refusing to overwrite an untracked executable.');
    if (!manifest.files.includes(game.selectedExecutable)) manifest.files.push(game.selectedExecutable);
    fs.writeFileSync(marker, JSON.stringify(manifest));
    fs.copyFileSync(this.runner, target);
    this.db.log('storage.prepare', { id: game.id, target });
    return target;
  }
  entries(root = this.root) {
    this.ensureRoot(root);
    return fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory() && !e.isSymbolicLink()).flatMap(e => {
      const dir = path.join(root, e.name); noLinks(dir);
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, '.generated.json'), 'utf8'));
        if (manifest.owner !== OWNER || !Array.isArray(manifest.files) || !manifest.files.every(safeExecutable)) return [];
        return [{ dir, manifest }];
      } catch { return []; }
    });
  }
  clean(keepIds = [], root = this.root) {
    let removed = 0;
    for (const { dir, manifest } of this.entries(root)) {
      if (keepIds.includes(manifest.id)) continue;
      for (const name of manifest.files) {
        const file = path.resolve(dir, name);
        if (!within(root, file)) throw new Error('Unsafe cleanup path.');
        noLinks(file);
        if (fs.existsSync(file)) { fs.unlinkSync(file); removed++; }
      }
      const marker = path.join(dir, '.generated.json');
      if (fs.readdirSync(dir).every(name => name === '.generated.json')) { fs.unlinkSync(marker); fs.rmdirSync(dir); }
      else { manifest.files = []; fs.writeFileSync(marker, JSON.stringify(manifest)); }
    }
    this.db.log('storage.cleanup', { root, removed }); return removed;
  }
  change(parent, action) {
    if (!['keep', 'move', 'regenerate'].includes(action)) throw new Error('Choose how to handle existing generated files.');
    const next = this.resolve(parent); this.ensureRoot(next);
    if (next === this.root) return;
    const previous = this.root;
    if (action === 'move') {
      // Copy all owned files first; remove originals only after every copy succeeds.
      for (const { dir, manifest } of this.entries(previous)) {
        const destination = path.join(next, path.basename(dir)); noLinks(destination);
        if (fs.existsSync(destination)) throw new Error('Migration destination already contains a game directory. Choose an empty location.');
        fs.mkdirSync(destination);
        fs.writeFileSync(path.join(destination, '.generated.json'), JSON.stringify(manifest));
        for (const name of manifest.files) {
          const src = path.join(dir, name), dest = path.join(destination, name); noLinks(src);
          if (dest.length > 240) throw new Error('Destination path is too long.');
          if (fs.existsSync(src)) fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL);
        }
      }
      this.clean([], previous);
    } else if (action === 'regenerate') this.clean([], previous);
    this.root = next;
    this.db.log('storage.migrate', { previous, next, action });
  }
}
module.exports = { StorageManager, sanitize, within, noLinks, parseLibraries, OWNER };
