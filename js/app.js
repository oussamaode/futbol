/* ============================================================
   SquadUp — app logic + localStorage persistence
   ============================================================ */

const STORAGE_KEYS = {
  users: 'squadup.users',
  activeUser: 'squadup.activeUser'
};

const state = {
  users: [],
  activeUserId: null,
  draft: {
    name: '',
    avatarId: AVATARS[0].id
  }
};

/* ---------- DOM ---------- */
const el = {
  screens: {
    create: document.getElementById('screen-create'),
    select: document.getElementById('screen-select'),
    home: document.getElementById('screen-home')
  },
  createBack: document.getElementById('create-back'),
  createPreview: document.getElementById('create-preview'),
  createPreviewName: document.getElementById('create-preview-name'),
  createSubmit: document.getElementById('create-submit'),
  createToSelect: document.getElementById('create-to-select'),
  nameField: document.getElementById('name-field'),
  nameInput: document.getElementById('name-input'),
  nameError: document.getElementById('name-error'),
  avatarGrid: document.getElementById('avatar-grid'),
  selectBack: document.getElementById('select-back'),
  selectAdd: document.getElementById('select-add'),
  userList: document.getElementById('user-list'),
  homeAvatar: document.getElementById('home-avatar'),
  homeName: document.getElementById('home-name'),
  homeSince: document.getElementById('home-since'),
  homeSwitch: document.getElementById('home-switch'),
  homeSignout: document.getElementById('home-signout'),
  toast: document.getElementById('toast')
};

/* ============================================================
   Persistence
   ============================================================ */
function loadState() {
  try {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.users);
    const parsed = rawUsers ? JSON.parse(rawUsers) : [];
    state.users = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    state.users = [];
  }

  const active = localStorage.getItem(STORAGE_KEYS.activeUser);
  const exists = active && state.users.some((u) => u.id === active);
  state.activeUserId = exists ? active : null;

  if (!exists && active) {
    localStorage.removeItem(STORAGE_KEYS.activeUser);
  }
}

function saveUsers() {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(state.users));
}

function saveActiveUser(id) {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.activeUser, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.activeUser);
  }
  state.activeUserId = id;
}

function getActiveUser() {
  return state.users.find((u) => u.id === state.activeUserId) || null;
}

function uid() {
  if (window.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ============================================================
   Helpers
   ============================================================ */
function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'recently';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

let toastTimer = null;
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2200);
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

function resolveStartScreen() {
  if (getActiveUser()) return 'home';
  if (state.users.length > 0) return 'select';
  return 'create';
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
    btn.setAttribute('aria-checked', String(avatar.id === state.draft.avatarId));
    btn.classList.toggle('is-selected', avatar.id === state.draft.avatarId);
    btn.innerHTML = renderAvatarSVG(avatar, 'grid-' + avatar.id);
    btn.addEventListener('click', () => selectAvatar(avatar.id));
    el.avatarGrid.appendChild(btn);
  });
}

function selectAvatar(id) {
  state.draft.avatarId = id;
  const avatar = getAvatar(id);
  el.avatarGrid.querySelectorAll('.avatar-option').forEach((btn) => {
    const selected = btn.dataset.id === id;
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-checked', String(selected));
  });
  el.createPreview.innerHTML = renderAvatarSVG(avatar, 'preview');
  el.createPreviewName.textContent = avatar.label;
}

function renderPreview() {
  const avatar = getAvatar(state.draft.avatarId);
  el.createPreview.innerHTML = renderAvatarSVG(avatar, 'preview');
  el.createPreviewName.textContent = avatar.label;
}

function renderUserList() {
  el.userList.innerHTML = '';
  state.users.forEach((user) => {
    const avatar = getAvatar(user.avatarId);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'user-card' + (user.id === state.activeUserId ? ' user-card--active' : '');
    card.setAttribute('role', 'listitem');
    card.innerHTML =
      renderAvatarSVG(avatar, 'list-' + user.id) +
      '<span class="user-card__info">' +
      `<span class="user-card__name">${escapeHtml(user.name)}</span>` +
      `<span class="user-card__meta">Player since ${formatDate(user.createdAt)}</span>` +
      '</span>' +
      '<span class="user-card__chev"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>';
    card.addEventListener('click', () => loginUser(user.id));
    el.userList.appendChild(card);
  });
}

function renderHome() {
  const user = getActiveUser();
  if (!user) return;
  const avatar = getAvatar(user.avatarId);
  el.homeAvatar.innerHTML = renderAvatarSVG(avatar, 'home');
  el.homeName.textContent = user.name;
  el.homeSince.textContent = `Playing since ${formatDate(user.createdAt)}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ============================================================
   Actions
   ============================================================ */
function loginUser(id) {
  const user = state.users.find((u) => u.id === id);
  if (!user) return;
  saveActiveUser(id);
  renderHome();
  showScreen('home');
  toast(`Welcome, ${user.name}!`);
}

function openCreate() {
  state.draft.name = '';
  state.draft.avatarId = AVATARS[0].id;
  el.nameInput.value = '';
  el.nameField.classList.remove('has-error');
  renderPreview();
  renderAvatarGrid();
  const hasUsers = state.users.length > 0;
  el.createBack.hidden = !hasUsers && !getActiveUser();
  el.createToSelect.hidden = !hasUsers;
  showScreen('create');
  setTimeout(() => el.nameInput.focus({ preventScroll: true }), 250);
}

function openSelect() {
  renderUserList();
  el.selectBack.hidden = !getActiveUser();
  showScreen('select');
}

function createProfile() {
  const name = el.nameInput.value.trim().replace(/\s+/g, ' ');

  if (name.length < 1 || name.length > 18) {
    el.nameField.classList.add('has-error');
    el.nameInput.focus();
    return;
  }
  el.nameField.classList.remove('has-error');

  const duplicate = state.users.find((u) => u.name.toLowerCase() === name.toLowerCase());
  const user = {
    id: uid(),
    name: duplicate ? `${name} ${state.users.length + 1}` : name,
    avatarId: state.draft.avatarId,
    createdAt: new Date().toISOString()
  };

  state.users.push(user);
  saveUsers();
  saveActiveUser(user.id);
  renderHome();
  showScreen('home');
  toast(`Profile created for ${user.name}!`);
}

function signOut() {
  saveActiveUser(null);
  showScreen(state.users.length ? 'select' : 'create');
  toast('Signed out.');
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
el.createToSelect.addEventListener('click', openSelect);
el.selectAdd.addEventListener('click', openCreate);
el.homeSwitch.addEventListener('click', openSelect);
el.homeSignout.addEventListener('click', signOut);

el.createBack.addEventListener('click', () => {
  showScreen(getActiveUser() ? 'home' : 'select');
});
el.selectBack.addEventListener('click', () => {
  if (getActiveUser()) showScreen('home');
});

/* ============================================================
   Boot
   ============================================================ */
function init() {
  loadState();
  renderPreview();
  renderAvatarGrid();
  renderUserList();

  const start = resolveStartScreen();
  if (start === 'create') {
    const hasUsers = state.users.length > 0;
    el.createBack.hidden = !getActiveUser();
    el.createToSelect.hidden = !hasUsers;
  } else if (start === 'home') {
    renderHome();
  } else {
    el.selectBack.hidden = !getActiveUser();
  }
  showScreen(start);
}

init();
