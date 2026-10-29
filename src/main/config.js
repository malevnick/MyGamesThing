const defaults = {
  startMinimized: false, minimizeToTray: true, closeToTray: true, continueInTray: true,
  defaultMode: 'popular', targetCount: 25, interval: { type: 'fixed', fixed: 90, min: 60, max: 120 },
  interGameDelay: 2, storageParent: '', popularityMode: 'curated', remoteControl: false,
};
function number(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label}: enter a number from ${min} to ${max}.`);
  return value;
}
function interval(value) {
  if (!value || !['fixed', 'random'].includes(value.type)) throw new Error('Invalid interval type.');
  const result = { type: value.type, fixed: number(value.fixed, 1, 604800, 'Fixed interval'), min: number(value.min, 1, 604800, 'Minimum interval'), max: number(value.max, 1, 604800, 'Maximum interval') };
  if (result.min > result.max) throw new Error('Minimum interval must not exceed maximum.');
  return result;
}
function settings(input) {
  const out = structuredClone(defaults);
  for (const key of ['startMinimized', 'minimizeToTray', 'closeToTray', 'continueInTray', 'remoteControl']) {
    if (typeof input[key] !== 'boolean') throw new Error(`Invalid ${key}`);
    out[key] = input[key];
  }
  if (!['popular', 'random', 'custom'].includes(input.defaultMode)) throw new Error('Invalid default mode.');
  out.defaultMode = input.defaultMode;
  out.targetCount = number(input.targetCount, 1, Number.MAX_SAFE_INTEGER, 'Target count');
  if (!Number.isInteger(out.targetCount)) throw new Error('Target count must be a whole number.');
  out.interval = interval(input.interval);
  out.interGameDelay = number(input.interGameDelay, 0, 3600, 'Inter-game delay');
  out.storageParent = typeof input.storageParent === 'string' ? input.storageParent : '';
  out.popularityMode = input.popularityMode === 'alphabetical' ? 'alphabetical' : 'curated';
  return out;
}
module.exports = { defaults, number, interval, settings };
