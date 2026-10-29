const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { QueueManager } = require('../src/main/queue-manager');
const { StorageManager, sanitize, parseLibraries } = require('../src/main/storage-manager');
const { safeExecutable, normalizeGame } = require('../src/main/discord-games');
const { Persistence } = require('../src/main/persistence');
function setup() {
  const data = new Map(); let now=1000;
  const db={read:(key,fallback)=>structuredClone(data.get(key)??fallback),write:(key,value)=>data.set(key,structuredClone(value)),log:()=>{}};
  const process={active:null,async launch(game){if(game.id==='bad')throw Error('Launch failed');this.active={exited:false};return {path:'generated.exe'};},async stop(){this.active=null;}};
  const queue=new QueueManager(db,process,()=>now,()=>.5);
  const games=['1','2','3'].map(id=>({id,name:`Game ${id}`,selectedExecutable:'game.exe',usable:true,tier:'A',rank:Number(id)}));
  const config={mode:'random',targetCount:50,interval:{type:'fixed',fixed:90,min:60,max:120},interGameDelay:0};
  return {queue,process,db,games,config,advance:ms=>{now+=ms;}};
}
test('absolute deadlines advance without renderer ticks; pause and crash recovery preserve remaining time',async()=>{
  const x=setup();x.queue.generate(x.config,x.games);assert.equal(new Set(x.queue.state.items.map(i=>i.game.id)).size,3);
  await x.queue.start();x.advance(30000);await x.queue.pause();assert.equal(x.queue.current().remainingMs,60000);assert.equal(x.process.active,null);
  x.advance(100000);await x.queue.start();x.advance(60001);await x.queue.tick();assert.equal(x.queue.state.index,1);assert.equal(x.queue.history[0].result,'completed');
  x.advance(5000);await x.queue.tick();const recovered=new QueueManager(x.db,x.process);assert.equal(recovered.state.status,'paused');assert.equal(recovered.state.recovered,true);assert.ok(recovered.current().remainingMs<=85000);
});
test('launch failures advance; skipped and stopped results are recorded',async()=>{
  const x=setup();x.queue.generate({...x.config,mode:'custom'},[{...x.games[0],id:'bad'},...x.games],['bad','1','2','3']);
  await x.queue.start();assert.equal(x.queue.history[0].result,'failed');assert.equal(x.queue.state.index,1);
  await x.queue.skip();await x.queue.tick();await x.queue.stop();assert.deepEqual(x.queue.history.map(h=>h.result),['failed','skipped','stopped']);
});
test('owned storage handles Windows paths and cleanup preserves untracked files',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mgt-core-'));const db=new Persistence(path.join(root,'state'));const runner=path.join(root,'runner.exe');fs.writeFileSync(runner,'test runner');
  const storage=new StorageManager(db,root,runner);storage.initialize(root);const game={id:'1',name:'CON',selectedExecutable:'game.exe'};const generated=storage.prepare(game);
  const personal=path.join(path.dirname(generated),'notes.txt');fs.writeFileSync(personal,'keep');assert.equal(storage.clean([]),1);assert.ok(fs.existsSync(personal));
  assert.equal(sanitize('CON'),'_CON');assert.equal(sanitize('Name: test. '),'Name_ test');assert.equal(safeExecutable('../bad.exe'),false);assert.equal(safeExecutable('CON.exe'),false);
  assert.deepEqual(parseLibraries('"path" "D:\\\\SteamLibrary"'),['D:\\SteamLibrary']);
  assert.equal(normalizeGame({id:'123',name:'Test',executables:[{os:'win32',name:'launcher.exe'}]}).usable,false);
});
