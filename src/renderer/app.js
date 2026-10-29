import { dashboard, updateDashboard } from './components/dashboard.js';
import { library, renderLibraryResults } from './components/library.js';
import { queues, renderQueueList } from './components/queue-view.js';
import { history } from './components/history.js';
import { settings } from './components/settings.js';
import { esc } from './components/shared.js';
const views = { dashboard, library, queues, history, settings };
let toastTimer, signature = '';
const ctx = {
  main: document.querySelector('#main'), state: null, games: [], history: [], presets: [], selected: new Set(), page: 'dashboard',
  filters: { search: '', tier: '', filter: 'all', page: 0 }, draft: null,
  api: (name, args) => window.mgt.command(name, args),
  toast(message, error = false) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.className = error ? 'error' : ''; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, error ? 9000 : 4000); },
  async run(fn) { try { await fn(); } catch (error) { ctx.toast(error.message, true); } },
  async loadPreset(value) {
    if (value.startsWith('saved:')) { const preset = ctx.presets[Number(value.split(':')[1])]; ctx.draft = structuredClone(preset); ctx.selected = new Set(preset.customIds); }
    else { const [mode,count] = value.split(':'); ctx.draft = { mode, targetCount: Number(count), interval: ctx.state.settings.interval, interGameDelay: ctx.state.settings.interGameDelay }; }
    navigate('queues');
  },
};
function render() { if (ctx.state) views[ctx.page](ctx); }
function navigate(page) {
  if (!views[page]) return; ctx.page = page;
  document.querySelectorAll('nav button').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  document.querySelector('#breadcrumb').innerHTML = `Workspace <b>/</b> ${page[0].toUpperCase() + page.slice(1)}`;
  if (page === 'queues' && ctx.selected.size && !ctx.draft) ctx.draft = { mode: 'custom', targetCount: ctx.selected.size, interval: ctx.state.settings.interval, interGameDelay: ctx.state.settings.interGameDelay };
  render(); ctx.main.scrollTop = 0;
  if (page === 'history' || page === 'library') ctx.run(async () => { ctx.history = await ctx.api('history'); if (ctx.page === 'history') history(ctx); });
}
function stateChanged(state) {
  const previousHistory = ctx.state?.historyCount; ctx.state = state;
  const s = state.session, nextSignature = JSON.stringify([s.status,s.index,s.recovered,s.items.map(i=>[i.key,i.status,i.error])]);
  document.querySelector('#catalog-status').textContent = !state.catalog.ready ? 'Loading game catalog…' : state.catalog.source === 'live' ? `● Live Discord list · ${state.catalog.count.toLocaleString()}` : state.catalog.source === 'cached' ? '◷ Cached list' : 'Catalog unavailable · Add custom games';
  document.querySelector('#catalog-status').classList.toggle('live', state.catalog.source === 'live');
  document.querySelector('#catalog-status').title = state.catalog.error || (state.catalog.fetchedAt ? `Fetched ${new Date(state.catalog.fetchedAt).toLocaleString()}` : '');
  document.querySelector('#sidebar-status').textContent = s.status === 'running' ? 'Rotation in progress' : s.status === 'paused' ? 'Session paused' : 'Ready when you are';
  if (ctx.page === 'dashboard') { if (signature !== nextSignature || !document.querySelector('#remaining')) dashboard(ctx); else updateDashboard(ctx); }
  if (ctx.page === 'queues' && signature !== nextSignature && document.querySelector('#queue-list')) renderQueueList(ctx);
  if (previousHistory !== state.historyCount && ctx.page === 'history') ctx.run(async () => { ctx.history = await ctx.api('history'); history(ctx); });
  signature = nextSignature;
}
async function refreshLibrary(fetch = false) {
  ctx.games = await ctx.api(fetch ? 'refresh' : 'library'); document.querySelector('#library-count').textContent = ctx.games.length.toLocaleString();
  if (ctx.page === 'library') renderLibraryResults(ctx);
}
function modal(content, save, label = 'Save') {
  const dialog = document.querySelector('#modal'), form = document.querySelector('#modal-form');
  document.querySelector('#modal-content').innerHTML = content;
  form.querySelector('button[type=submit]').textContent = label;
  form.onsubmit = event => { event.preventDefault(); ctx.run(async () => { await save(new FormData(form)); dialog.close(); }); };
  dialog.showModal();
}
function changeStorage(parent) {
  modal(`<h2>Change storage location</h2><p>New parent folder: ${esc(parent || 'Automatic Steam library or local application data')}</p><label>Existing generated executables<select name="action"><option value="keep">Leave in the previous location</option><option value="move">Move to the new location</option><option value="regenerate">Delete and regenerate when needed</option></select></label>`, async form => {
    await ctx.api('change-storage', { parent, action: form.get('action') }); ctx.state = await ctx.api('snapshot'); settings(ctx); ctx.toast('Storage location updated.');
  }, 'Apply location');
}
document.querySelector('#modal-cancel').addEventListener('click', () => document.querySelector('#modal').close());
document.addEventListener('click', event => {
  const b = event.target.closest('button'); if (!b || b.disabled) return;
  const d = b.dataset;
  ctx.run(async () => {
    if (d.page || d.nav) return navigate(d.page || d.nav);
    if (d.action) return ctx.api(d.action);
    if (d.preset) return ctx.loadPreset(d.preset);
    if ('refresh' in d) { b.disabled = true; try { await refreshLibrary(true); ctx.toast(ctx.state.catalog.source === 'live' ? 'Discord list refreshed.' : 'Using the last available list.'); } finally { b.disabled = false; } return; }
    if (d.favorite || d.blacklist) { ctx.games = await ctx.api(d.favorite ? 'favorite' : 'blacklist', { id: d.favorite || d.blacklist }); if (d.blacklist) ctx.selected.delete(d.blacklist); renderLibraryResults(ctx); return; }
    if (d.select) { if (ctx.selected.has(d.select)) ctx.selected.delete(d.select); else ctx.selected.add(d.select); ctx.draft = null; renderLibraryResults(ctx); return; }
    if (d.play) { if (await ctx.api('play', { id: d.play })) navigate('dashboard'); return; }
    if (d.libraryPage) { ctx.filters.page += Number(d.libraryPage); renderLibraryResults(ctx); ctx.main.scrollTop = 0; return; }
    if (d.historyPage) { ctx.historyPage = (ctx.historyPage || 0) + Number(d.historyPage); history(ctx); return; }
    if (d.remove) return ctx.api('remove', { key: d.remove });
    if (d.move) return ctx.api('move', { key: d.move, direction: Number(d.direction) });
    if ('addCustom' in d) return modal('<h2>Add a custom game</h2><p>Use the executable name expected by Discord. Detection is not guaranteed for unlisted games.</p><label>Game name<input name="name" maxlength="200" required></label><label>Executable filename<input name="executable" placeholder="MyGame.exe" required></label><label>Discord application ID (optional)<input name="id" pattern="[0-9]{1,24}"></label>', async form => { ctx.games = await ctx.api('add-custom',Object.fromEntries(form)); library(ctx); ctx.toast('Custom game added.'); });
    if ('savePreset' in d) return modal('<h2>Save this queue as a preset</h2><p>Custom presets retain your selected order. Random presets create a new lineup.</p><label>Preset name<input name="name" maxlength="80" required></label>', async form => { ctx.presets = await ctx.api('save-preset', { name: form.get('name') }); queues(ctx); ctx.toast('Preset saved.'); });
    if ('showBlacklist' in d) { ctx.filters.filter = 'blacklist'; navigate('library'); return; }
    if ('export' in d) { if (await ctx.api('export-history')) ctx.toast('History exported.'); return; }
    if ('clearHistory' in d) { ctx.history = await ctx.api('clear-history'); ctx.historyPage = 0; history(ctx); return; }
    if ('pickStorage' in d) { const parent = await ctx.api('pick-storage'); if (parent) changeStorage(parent); return; }
    if ('defaultStorage' in d) return changeStorage('');
    if ('applySteam' in d) { const steam = document.querySelector('#steam-library').value; if (!steam) throw new Error('Select a detected Steam library first.'); return changeStorage(`${steam}\\steamapps\\common`); }
    if (d.clean) { const removed = await ctx.api('clean', { all: d.clean === 'all' }); if (removed !== null) ctx.toast(`${removed} generated files removed.`); return; }
    if ('remoteInfo' in d) { const info = await ctx.api('remote-info'); document.querySelector('#remote-details').innerHTML = `<div class="path">HTTP: ${esc(info.http)}<br>UDP: ${esc(info.udp)}<br>Token: ${esc(info.token)}</div>`; }
  });
});
document.addEventListener('change', event => { const id = event.target.dataset.executable; if (id) ctx.run(async () => { ctx.games = await ctx.api('select-executable',{ id, name: event.target.value }); renderLibraryResults(ctx); }); });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); navigate('library'); document.querySelector('#search').focus(); } });
window.mgt.onState(stateChanged); window.mgt.onCatalog(() => ctx.run(() => refreshLibrary())); window.mgt.onError(message => ctx.toast(message,true));
ctx.run(async () => {
  const [state,games,presets,records] = await Promise.all([ctx.api('snapshot'),ctx.api('library'),ctx.api('presets'),ctx.api('history')]);
  if (games.length || !ctx.games.length) ctx.games = games;
  ctx.presets = presets; ctx.history = records; stateChanged(ctx.state?.catalog.ready ? ctx.state : state); render();
  document.querySelector('#library-count').textContent = ctx.games.length.toLocaleString();
  if (ctx.state.catalog.ready && !ctx.games.length) await refreshLibrary();
  if (state.notice) ctx.toast(state.notice,true);
});
