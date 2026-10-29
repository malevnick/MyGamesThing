export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
export const time = ms => { const s = Math.max(0, Math.ceil((ms || 0) / 1000)); return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const date = timestamp => timestamp ? new Date(timestamp).toLocaleString() : '—';
export const icon = (game, big = false) => game?.icon ? `<img class="game-icon ${big ? 'big' : ''}" src="https://cdn.discordapp.com/app-icons/${esc(game.id)}/${esc(game.icon)}.png?size=128" alt="" loading="lazy">` : `<span class="game-icon ${big ? 'big' : ''}">${esc(game?.name?.slice(0, 2).toUpperCase() || 'mg')}</span>`;
export const badge = status => `<span class="badge ${esc(status)}">${esc(status)}</span>`;
export const heading = (title, subtitle, actions = '') => `<div class="page-heading"><div><h1>${title}</h1><p class="sub">${subtitle}</p></div><div>${actions}</div></div>`;
export const empty = (title, text) => `<div class="empty"><strong>${title}</strong>${text}</div>`;
export const stat = (label, value, detail, id = '') => `<div class="stat"><small>${label}</small><strong ${id ? `id="${id}"` : ''}>${value}</strong><div class="meta">${detail}</div></div>`;
export function timingFields(value, prefix = '') {
  return `<label>Interval<select name="${prefix}type"><option value="fixed" ${value.type === 'fixed' ? 'selected' : ''}>Fixed duration</option><option value="random" ${value.type === 'random' ? 'selected' : ''}>Random range</option></select></label><label>Fixed interval (seconds)<input name="${prefix}fixed" type="number" min="1" max="604800" value="${value.fixed}" required></label><label>Minimum (seconds)<input name="${prefix}min" type="number" min="1" max="604800" value="${value.min}" required></label><label>Maximum (seconds)<input name="${prefix}max" type="number" min="1" max="604800" value="${value.max}" required></label>`;
}
export const readTiming = form => ({ type: form.get('type'), fixed: Number(form.get('fixed')), min: Number(form.get('min')), max: Number(form.get('max')) });
