const { app, BrowserWindow, ipcMain, net, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { Persistence } = require('./persistence');
const { StorageManager } = require('./storage-manager');
const { ProcessManager } = require('./process-manager');
const { DiscordGames } = require('./discord-games');
const { QueueManager } = require('./queue-manager');
const { ApplicationService } = require('./service');
const { RemoteControl } = require('./remote-control');
const { defaults } = require('./config');
app.setName('MyGamesThing');
if (process.env.MGT_TEST_USER_DATA) app.setPath('userData', process.env.MGT_TEST_USER_DATA);
let window, tray, service, queue, db, remote, quitting = false, timer;
let chain = Promise.resolve();
function serial(fn) { const result = chain.then(fn); chain = result.catch(error => db?.log('command.error', { error: error.message })); return result; }
const page = path.join(__dirname, '../renderer/index.html');
function show() { window?.show(); window?.focus(); }
function publish() {
  if (!service || !window || window.isDestroyed()) return;
  window.webContents.send('mgt:state', service.snapshot());
  if (tray) tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show MyGamesThing', click: show },
    { label: queue.current()?.game.name || 'No active game', enabled: false }, { type: 'separator' },
    { label: queue.state.status === 'paused' ? 'Resume' : 'Pause', enabled: ['running', 'waiting', 'paused'].includes(queue.state.status), click: () => serial(() => queue.state.status === 'paused' ? queue.start() : queue.pause()).catch(report) },
    { label: 'Skip', enabled: ['running', 'waiting', 'paused'].includes(queue.state.status), click: () => serial(() => queue.skip()).catch(report) },
    { label: 'Stop rotation', click: () => serial(() => queue.stop()).catch(report) },
    { type: 'separator' }, { label: 'Quit', click: () => app.quit() },
  ]));
}
function report(error) { db?.log('error', { error: error.stack || error.message }); if (window && !window.isDestroyed()) window.webContents.send('mgt:error', error.message); }
function createWindow() {
  window = new BrowserWindow({ width: 1280, height: 850, minWidth: 980, minHeight: 650, show: false, title: 'MyGamesThing', backgroundColor: '#101215', autoHideMenuBar: true, icon: path.join(__dirname, '../../assets/icon.png'), webPreferences: { preload: path.join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.webContents.on('render-process-gone', (_event, details) => db.log('renderer.gone', details));
  window.on('close', event => { if (!quitting && service.settings.closeToTray) { event.preventDefault(); window.hide(); if (!service.settings.continueInTray) serial(() => queue.pause()).catch(report); } });
  window.on('minimize', () => { if (service.settings.minimizeToTray) { window.hide(); if (!service.settings.continueInTray) serial(() => queue.pause()).catch(report); } });
  window.once('ready-to-show', () => { if (!service.settings.startMinimized || process.env.MGT_SMOKE) show(); });
  window.loadFile(page);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', show);
  app.whenReady().then(async () => {
    db = new Persistence(app.getPath('userData')); db.log('startup', { version: app.getVersion() });
    const saved = { ...structuredClone(defaults), ...db.read('settings', defaults) };
    const runner = app.isPackaged ? path.join(process.resourcesPath, 'runner.exe') : path.join(__dirname, '../../assets/runner.exe');
    const storage = new StorageManager(db, process.env.LOCALAPPDATA || app.getPath('userData'), runner);
    await storage.discover();
    let storageError = '';
    try { storage.initialize(saved.storageParent); } catch (error) { storageError = error.message; storage.initialize(''); saved.storageParent = ''; }
    const processes = new ProcessManager(db, storage); await processes.recover();
    queue = new QueueManager(db, processes);
    const catalog = new DiscordGames(db, (...args) => net.fetch(...args));
    service = new ApplicationService({ db, storage, queue, catalog, settings: saved, dialog, shell, window: () => window }); service.notice = storageError;
    remote = new RemoteControl(service, serial, db); if (saved.remoteControl) remote.start(); service.remote = remote;
    queue.on('change', publish);
    ipcMain.handle('mgt:command', async (event, command, args) => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== pathToFileURL(page).href) throw new Error('Untrusted IPC sender.');
      try {
        // Native dialogs must not hold the queue transition lock while awaiting the user.
        if (command === 'play' && ['running', 'waiting', 'paused'].includes(queue.state.status) && !await service.confirm('Replace the current session?', 'The current game will stop.')) return { ok: true, value: false };
        if (command === 'clean' && !await service.confirm(args?.all ? 'Delete all generated executables?' : 'Clean unused generated executables?', 'Only files tracked by MyGamesThing in the current storage root will be deleted.')) return { ok: true, value: null };
        if (command === 'clear-history' && !await service.confirm('Clear history?', 'This removes the local history records.')) return { ok: true, value: queue.history };
        return { ok: true, value: await (['snapshot', 'library', 'history', 'presets', 'refresh', 'remote-info', 'pick-storage', 'export-history'].includes(command) ? service.command(command, args) : serial(() => service.command(command, args))) };
      }
      catch (error) { db.log('ipc.error', { command, error: error.message }); return { ok: false, error: error.message }; }
      finally { publish(); }
    });
    createWindow();
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '../../assets/icon.png')).resize({ width: 16, height: 16 }));
    tray.setToolTip('MyGamesThing'); tray.on('click', show); publish();
    let ticking = false;
    timer = setInterval(() => { if (!ticking) { ticking = true; serial(() => queue.tick()).catch(report).finally(() => { ticking = false; publish(); }); } }, 500);
    catalog.load().then(() => { service.catalogReady = true; if (!window.isDestroyed()) window.webContents.send('mgt:catalog'); publish(); }).catch(report);
    if (process.env.MGT_SMOKE) window.webContents.once('did-finish-load', async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const result = await window.webContents.executeJavaScript('({title:document.title,bridge:typeof window.mgt?.command,nav:document.querySelectorAll("nav button").length,heading:document.querySelector("h1")?.textContent,error:document.querySelector("#toast.error")?.textContent})');
        db.log('smoke.renderer', result);
        if (result.title !== 'MyGamesThing' || result.bridge !== 'function' || result.nav !== 5 || !result.heading || result.error) throw new Error(`Renderer smoke test failed: ${JSON.stringify(result)}`);
        if (process.env.MGT_CAPTURE) fs.writeFileSync(process.env.MGT_CAPTURE, (await window.webContents.capturePage()).toPNG());
        fs.writeFileSync(path.join(db.root, 'smoke-result.json'), JSON.stringify(result));
      } catch (error) { report(error); process.exitCode = 1; }
      setTimeout(() => app.quit(), 1500);
    });
  }).catch(error => { dialog.showErrorBox('MyGamesThing could not start', error.message); app.exit(1); });
  app.on('window-all-closed', () => { if (!service?.settings.closeToTray) app.quit(); });
  app.on('before-quit', event => {
    if (quitting) return;
    event.preventDefault(); clearInterval(timer);
    serial(async () => { await queue?.pause(); await service?.queue.processes.stop(); remote?.stop(); quitting = true; db?.log('shutdown'); app.quit(); }).catch(error => { report(error); dialog.showErrorBox('Could not safely stop the generated process', error.message); });
  });
}
