/*
 * SquadUp — Avatar library
 * 10 pre-defined, modern SVG avatars (gradient squircle + flat icon).
 * Each avatar is fully self-contained so it renders identically anywhere.
 */
const AVATARS = [
  {
    id: 'neo',
    label: 'Neo',
    from: '#1f6cff',
    to: '#0b3cff',
    icon: '<circle cx="50" cy="36" r="16"/><rect x="26" y="58" width="48" height="24" rx="12"/>'
  },
  {
    id: 'pulse',
    label: 'Pulse',
    from: '#ff6b1c',
    to: '#ff3c00',
    icon: '<path d="M26 54h10l8-22 14 38 8-16h8"/><circle cx="50" cy="50" r="6" fill="none" stroke="#fff" stroke-width="6"/>'
  },
  {
    id: 'arc',
    label: 'Arc',
    from: '#22d3ee',
    to: '#0ea5e9',
    icon: '<path d="M20 66 A30 30 0 0 1 80 66" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle cx="20" cy="66" r="6"/><circle cx="80" cy="66" r="6"/><circle cx="50" cy="36" r="10"/>'
  },
  {
    id: 'hex',
    label: 'Hex',
    from: '#a855f7',
    to: '#7c3aed',
    icon: '<polygon points="50 18 78 33 78 67 50 82 22 67 22 33" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><circle cx="50" cy="50" r="9"/>'
  },
  {
    id: 'bolt',
    label: 'Bolt',
    from: '#f59e0b',
    to: '#f43f5e',
    icon: '<path d="M54 16 28 56h16l-6 28 26-44H48l6-24z"/>'
  },
  {
    id: 'chip',
    label: 'Chip',
    from: '#10b981',
    to: '#22c55e',
    icon: '<rect x="22" y="28" width="56" height="44" rx="8"/><path d="M34 28v-6h32v6M34 72v6h32v-6"/><circle cx="50" cy="50" r="10"/>'
  },
  {
    id: 'orbit',
    label: 'Orbit',
    from: '#38bdf8',
    to: '#2563eb',
    icon: '<circle cx="50" cy="50" r="20"/><ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="#fff" stroke-width="6" transform="rotate(-25 50 50)"/><circle cx="90" cy="40" r="6"/>'
  },
  {
    id: 'vibe',
    label: 'Vibe',
    from: '#ec4899',
    to: '#f97316',
    icon: '<path d="M26 64 C34 28 66 28 74 64 L74 74 L26 74 Z"/><circle cx="38" cy="48" r="6"/><circle cx="62" cy="48" r="6"/>'
  },
  {
    id: 'grid',
    label: 'Grid',
    from: '#0ea5e9',
    to: '#22d3ee',
    icon: '<rect x="22" y="22" width="20" height="20" rx="3"/><rect x="58" y="22" width="20" height="20" rx="3"/><rect x="22" y="58" width="20" height="20" rx="3"/><rect x="58" y="58" width="20" height="20" rx="3"/>'
  },
  {
    id: 'crest',
    label: 'Crest',
    from: '#14b8a6',
    to: '#0ea5e9',
    icon: '<path d="M50 20 L72 28 L72 46 C72 64 62 78 50 82 C38 78 28 64 28 46 L28 28 Z"/><path d="M40 46 L46 56 L60 38" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
  }
];

/**
 * Build the SVG markup for an avatar.
 * @param {object} avatar - entry from AVATARS
 * @param {string} key - unique suffix so multiple copies keep distinct gradient ids
 */
function renderAvatarSVG(avatar, key) {
  const g = `grad-${avatar.id}-${key}`;
  const gloss = `gloss-${avatar.id}-${key}`;
  return (
    `<svg class="avatar-svg" viewBox="0 0 100 100" role="img" aria-label="${avatar.label} avatar" xmlns="http://www.w3.org/2000/svg">` +
    `<defs>` +
    `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${avatar.from}"/>` +
    `<stop offset="1" stop-color="${avatar.to}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${gloss}" cx="30%" cy="18%" r="85%">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/>` +
    `<stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="100" height="100" rx="30" fill="url(#${g})"/>` +
    `<rect width="100" height="100" rx="30" fill="url(#${gloss})"/>` +
    `<g transform="translate(50 50) scale(0.6) translate(-50 -50)" fill="#ffffff">${avatar.icon}</g>` +
    `</svg>`
  );
}

function getAvatar(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}
