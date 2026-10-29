const ranking = require('../../data/popular-games.json');
const normalize = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const prepared = ranking.map((entry, index) => ({ ...entry, index, names: [entry.name, ...(entry.aliases || [])].map(name => { const key = normalize(name); return { key, tokens: new Set(key.split(' ')) }; }) }));
function similarity(a, b) {
  a = normalize(a); b = normalize(b);
  if (a === b) return 1;
  const left = new Set(a.split(' ')), right = new Set(b.split(' '));
  const shared = [...left].filter(t => right.has(t)).length;
  return 2 * shared / (left.size + right.size);
}
function rank(name) {
  const key = normalize(name), tokens = new Set(key.split(' '));
  let best = { tier: 'D', rank: 99999, score: 0 };
  prepared.forEach(entry => {
    const score = Math.max(...entry.names.map(alias => { if (key === alias.key) return 1; let shared = 0; for (const token of tokens) if (alias.tokens.has(token)) shared++; return 2 * shared / (tokens.size + alias.tokens.size); }));
    if (score >= 0.84 && score > best.score) best = { tier: entry.tier, rank: entry.index, score };
  });
  return best;
}
module.exports = { normalize, similarity, rank };
