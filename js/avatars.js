/*
 * SquadUp — Avatar library
 * 10 pre-defined, modern SVG avatars (gradient squircle + flat icon).
 * Each avatar is fully self-contained so it renders identically anywhere.
 */
const AVATARS = [
  {
    id: 'blaze',
    label: 'Blaze',
    from: '#ff512f',
    to: '#f09819',
    icon: '<path d="M50 14c1 14 18 22 18 40a18 18 0 0 1-36 0c0-7 3-13 8-19 0 6 2 10 5 12 -3-12-1-25 5-33z"/>'
  },
  {
    id: 'volt',
    label: 'Volt',
    from: '#f9d423',
    to: '#ff4e50',
    icon: '<path d="M57 10 28 54h15l-6 36 31-46H51l6-34z"/>'
  },
  {
    id: 'sprout',
    label: 'Sprout',
    from: '#43e97b',
    to: '#38f9d7',
    icon: '<path d="M76 18C42 20 22 40 22 66c0 7 5 12 12 12 26 0 44-22 46-52 0-5-2-8-4-8z"/><path d="M30 70c8-12 20-22 34-28" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="5" stroke-linecap="round"/>'
  },
  {
    id: 'wave',
    label: 'Wave',
    from: '#2193b0',
    to: '#6dd5ed',
    icon: '<path d="M16 42q9-14 18 0t18 0t18 0t18 0" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/><path d="M16 64q9-14 18 0t18 0t18 0" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="8" stroke-linecap="round"/>'
  },
  {
    id: 'comet',
    label: 'Comet',
    from: '#8e2de2',
    to: '#4a00e0',
    icon: '<path d="M50 16l9.6 20.9 22.4 2.5-16.6 15.3 4.6 22.1L50 65.7 30 76.8l4.6-22.1L18 39.4l22.4-2.5z"/>'
  },
  {
    id: 'luna',
    label: 'Luna',
    from: '#3a1c71',
    to: '#4776e6',
    icon: '<path d="M60 16a36 36 0 1 0 24 62A28 28 0 0 1 60 16Z"/>'
  },
  {
    id: 'heart',
    label: 'Heart',
    from: '#ff0844',
    to: '#ffb199',
    icon: '<path d="M50 80C24 60 16 45 24 33c7-10 20-10 26 0 6-10 19-10 26 0 8 12 0 27-26 47z"/>'
  },
  {
    id: 'sunny',
    label: 'Sunny',
    from: '#f7971e',
    to: '#ffd200',
    icon: '<circle cx="50" cy="50" r="17"/><g stroke="#fff" stroke-width="6" stroke-linecap="round"><line x1="50" y1="12" x2="50" y2="24"/><line x1="50" y1="76" x2="50" y2="88"/><line x1="12" y1="50" x2="24" y2="50"/><line x1="76" y1="50" x2="88" y2="50"/><line x1="24" y1="24" x2="33" y2="33"/><line x1="67" y1="67" x2="76" y2="76"/><line x1="76" y1="24" x2="67" y2="33"/><line x1="33" y1="67" x2="24" y2="76"/></g>'
  },
  {
    id: 'peak',
    label: 'Peak',
    from: '#11998e',
    to: '#38ef7d',
    icon: '<path d="M10 74l24-40 13 19 9-13 24 34z"/><path d="M34 34l4.5 6.8-3.6 3 3.6 3-4.5 5.2" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  {
    id: 'nova',
    label: 'Nova',
    from: '#c471ed',
    to: '#f64f59',
    icon: '<circle cx="50" cy="50" r="22"/><ellipse cx="50" cy="50" rx="42" ry="14" fill="none" stroke="#fff" stroke-width="6" transform="rotate(-20 50 50)"/>'
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
