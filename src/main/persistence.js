const fs = require('node:fs');
const path = require('node:path');

class Persistence {
  constructor(root) { this.root = root; fs.mkdirSync(root, { recursive: true }); }
  read(name, fallback) {
    const file = path.join(this.root, `${name}.json`);
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') {
        this.log('storage.read.error', { name, error: error.message });
        try { fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`); } catch {}
        try { return JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8')); } catch {}
      }
      return structuredClone(fallback);
    }
  }
  write(name, value) {
    const file = path.join(this.root, `${name}.json`);
    const temp = `${file}.tmp`;
    const fd = fs.openSync(temp, 'w');
    try { fs.writeFileSync(fd, JSON.stringify(value, null, 2)); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
    fs.renameSync(temp, file);
  }
  log(event, detail = {}) {
    const file = path.join(this.root, 'app.log');
    try {
      if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) fs.renameSync(file, `${file}.1`);
      fs.appendFileSync(file, `${new Date().toISOString()} ${event} ${JSON.stringify(detail)}\n`);
    } catch (error) { console.error('Log write failed:', error.message); }
  }
}
module.exports = { Persistence };
