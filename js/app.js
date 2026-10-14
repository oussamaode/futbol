/* ============================================================
   SquadUp — app shell & personal identity
   Each device stores ONLY its own Player ID (+ display fields)
   in localStorage. The match lineup itself lives in Firebase.
   ============================================================ */

const PLAYER_KEY = 'squadup.player';

/* Legacy keys from earlier versions — cleared on boot. */
const LEGACY_KEYS = ['squadup.users', 'squadup.activeUser', 'squadup.lineup'];

let player = null; // { id, name, avatarId, createdAt }

const draft = {
  avatarId: AVATARS[0].id
};

/* ---------- DOM ---------- */
const el = {
  screens: {
    create: document.getElementById('screen-create'),
    home: document.getElementById('screen-home')
  },
  createBack: document.getElementById('create-back'),
  createPreview: document.getElementById('create-preview'),
  createPreviewName: document.getElementById('create-preview-name'),
  createSubmit: document.getElementById('create-submit'),
  nameField: document.getElementById('name-field'),
  nameInput: document.getElementById('name-input'),
  nameError: document.getElementById('name-error'),
  avatarGrid: document.getElementById('avatar-grid'),
  homeAvatar: document.getElementById('home-avatar'),
  homeName: document.getElementById('home-name'),
  homeSince: document.getElementById('home-since'),
  homeSwitch: document.getElementById('home-switch'),
  toast: document.getElementById('toast')
};

/* ============================================================
   Persistence (device identity only)
   ============================================================ */
function loadPlayer() {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.id && parsed.name) {
      player = {
        id: String(parsed.id),
        name: String(parsed.name),
        avatarId: parsed.avatarId || AVATARS[0].id,
        createdAt: parsed.createdAt || new Date().toISOString()
      };
    } else {
      player = null;
    }
  } catch (err) {
    player = null;
  }
}

function savePlayer(next) {
  player = next;
  localStorage.setItem(PLAYER_KEY, JSON.stringify(next));
}

function clearPlayer() {
  player = null;
  localStorage.removeItem(PLAYER_KEY);
}

function getActivePlayer() {
  return player;
}

function makePlayerId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: Firebase-style-ish random id
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

/* ============================================================
   Helpers
   ============================================================ */
function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'recently';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

let toastTimer = null;
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2400);
}

/* ============================================================
   Navigation
   ============================================================ */
function showScreen(name) {
  Object.entries(el.screens).forEach(([key, node]) => {
    node.classList.toggle('is-active', key === name);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   Rendering
   ============================================================ */
function renderAvatarGrid() {
  el.avatarGrid.innerHTML = '';
  AVATARS.forEach((avatar) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option';
    btn.dataset.id = avatar.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', avatar.label);
    btn.setAttribute('aria-checked', String(avatar.id === draft.avatarId));
    btn.classList.toggle('is-selected', avatar.id === draft.avatarId);
    btn.innerHTML = renderAvatarSVG(avatar, 'grid-' + avatar.id);
    btn.addEventListener('click', () => selectAvatar(avatar.id));
    el.avatarGrid.appendChild(btn);
  });
}

function selectAvatar(id) {
  draft.avatarId = id;
  el.avatarGrid.querySelectorAll('.avatar-option').forEach((btn) => {
    const selected = btn.dataset.id === id;
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-checked', String(selected));
  });
  renderPreview();
}

function renderPreview() {
  const avatar = getAvatar(draft.avatarId);
  el.createPreview.innerHTML = renderAvatarSVG(avatar, 'preview');
  el.createPreviewName.textContent = avatar.label;
}

function renderHome() {
  if (!player) return;
  const avatar = getAvatar(player.avatarId);
  el.homeAvatar.innerHTML = renderAvatarSVG(avatar, 'home');
  el.homeName.textContent = player.name;
  el.homeSince.textContent = `Playing since ${formatDate(player.createdAt)}`;
  if (window.Lineup) window.Lineup.render();
}

/* ============================================================
   Actions
   ============================================================ */
function openCreate() {
  draft.avatarId = AVATARS[0].id;
  el.nameInput.value = '';
  el.nameField.classList.remove('has-error');
  renderPreview();
  renderAvatarGrid();
  el.createBack.hidden = !player;
  showScreen('create');
  setTimeout(() => el.nameInput.focus({ preventScroll: true }), 250);
}

function createProfile() {
  const name = el.nameInput.value.trim().replace(/\s+/g, ' ');

  if (name.length < 1 || name.length > 18) {
    el.nameField.classList.add('has-error');
    el.nameInput.focus();
    return;
  }
  el.nameField.classList.remove('has-error');

  savePlayer({
    id: makePlayerId(),
    name: name,
    avatarId: draft.avatarId,
    createdAt: new Date().toISOString()
  });

  renderHome();
  showScreen('home');
  toast(`Welcome, ${player.name}!`);
}

function switchPlayer() {
  clearPlayer();
  if (window.Lineup) window.Lineup.render();
  openCreate();
}

/* ============================================================
   Events
   ============================================================ */
el.createSubmit.addEventListener('click', createProfile);
el.nameInput.addEventListener('input', () => {
  if (el.nameInput.value.trim().length > 0) {
    el.nameField.classList.remove('has-error');
  }
});
el.nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') createProfile();
});
el.homeSwitch.addEventListener('click', switchPlayer);
el.createBack.addEventListener('click', () => {
  if (player) showScreen('home');
});

/* ============================================================
   Boot
   ============================================================ */
function init() {
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  loadPlayer();
  renderPreview();
  renderAvatarGrid();

  if (player) {
    renderHome();
    showScreen('home');
  } else {
    el.createBack.hidden = true;
    showScreen('create');
  }
}

init();
