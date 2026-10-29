const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
let count = 0;
for (const file of ['src','scripts','tests'].flatMap(walk).filter(p=>p.endsWith('.js'))) {
  const result = spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); } count++;
}
JSON.parse(fs.readFileSync('data/popular-games.json','utf8'));
console.log(`Syntax checked ${count} JavaScript files and popularity data.`);
