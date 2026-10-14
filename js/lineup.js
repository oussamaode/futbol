/* ============================================================
   SquadUp — Live match lineup (Firebase Realtime Database)
   ------------------------------------------------------------
   • Live sync of "matchLineup" via onValue for every device.
   • Anti-overwrite: latest DB read + atomic transaction per slot.
   • Ownership: a player can only vacate/move their OWN slot.
   • Share Lineup: builds a WhatsApp-ready markdown summary.
   ============================================================ */

(function () {
  'use strict';

  const FIREBASE = window.FIREBASE || null;
  const db = FIREBASE && FIREBASE.db ? FIREBASE.db : null;
  const PATH = FIREBASE ? FIREBASE.LINEUP_PATH : 'matchLineup';
  const APP_URL = FIREBASE ? FIREBASE.APP_URL : '';

  const TEAMS = {
    blue: { id: 'blue', name: 'Blue Team', emoji: '🔵' },
    orange: { id: 'orange', name: 'Orange Team', emoji: '🟠' }
  };

  /* 1-3-3-2 formation. Coordinates are % of the pitch for the team
     defending the bottom half; Orange is mirrored vertically. */
  const FIELD_SLOTS = [
    { key: 'gk', label: 'GK', name: 'Goalkeeper', x: 50, y: 90 },
    { key: 'lb', label: 'LB', name: 'Left Back', x: 22, y: 77 },
    { key: 'cb', label: 'CB', name: 'Centre Back', x: 50, y: 77 },
    { key: 'rb', label: 'RB', name: 'Right Back', x: 78, y: 77 },
    { key: 'lm', label: 'LM', name: 'Left Midfielder', x: 24, y: 62 },
    { key: 'cm', label: 'CM', name: 'Centre Midfielder', x: 50, y: 62 },
    { key: 'rm', label: 'RM', name: 'Right Midfielder', x: 76, y: 62 },
    { key: 'ls', label: 'ST', name: 'Striker', x: 38, y: 42 },
    { key: 'rs', label: 'ST', name: 'Striker', x: 62, y: 42 }
  ];

  const BENCH_SLOTS = [
    { key: 'sub1', label: 'SUB 1', name: 'Substitute' },
    { key: 'sub2', label: 'SUB 2', name: 'Substitute' }
  ];

  const FIELD_KEYS = FIELD_SLOTS.map((s) => s.key);
  const BENCH_KEYS = BENCH_SLOTS.map((s) => s.key);
  const ALL_KEYS = FIELD_KEYS.concat(BENCH_KEYS);
  const MAX_FIELD = FIELD_KEYS.length; // 9
  const MAX_BENCH = BENCH_KEYS.length; // 2
  const MAX_TOTAL = MAX_FIELD + MAX_BENCH; // 11

  const LABELS = {};
  const NAMES = {};
  FIELD_SLOTS.forEach((s) => { LABELS[s.key] = s.label; NAMES[s.key] = s.name; });
  BENCH_SLOTS.forEach((s) => { LABELS[s.key] = s.label; NAMES[s.key] = s.name; });

  let lineupData = { blue: {}, orange: {} };
  let connected = false;
  let sheetMode = null; // 'slot' | 'team' | null
  let currentSlot = null;

  const dom = {
    pitchSlots: document.getElementById('pitch-slots'),
    bench: document.getElementById('bench'),
    joinPanel: document.getElementById('join-panel'),
    shareBtn: document.getElementById('share-lineup'),
    connPill: document.getElementById('conn-status'),
    connText: document.getElementById('conn-text'),
    sheet: document.getElementById('sheet'),
    sheetEyebrow: document.getElementById('sheet-eyebrow'),
    sheetTitle: document.getElementById('sheet-title'),
    sheetBody: document.getElementById('sheet-body'),
    sheetFoot: document.getElementById('sheet-foot'),
    sheetClose: document.getElementById('sheet-close')
  };

  /* ============================================================
     Firebase helpers
     ============================================================ */
  function normalize(value) {
    const v = value || {};
    return {
      blue: v.blue && typeof v.blue === 'object' ? v.blue : {},
      orange: v.orange && typeof v.orange === 'object' ? v.orange : {}
    };
  }

  function readLatest() {
    if (!db) return Promise.resolve(normalize(lineupData));
    return db.ref(PATH).once('value').then((snap) => normalize(snap.val()));
  }

  function slotRef(team, key) {
    return db.ref(PATH + '/' + team + '/' + key);
  }

  /* Atomic claim of a slot. Aborts if another player owns it. */
  function tryOccupy(team, key, me) {
    return slotRef(team, key)
      .transaction((cur) => {
        if (cur && cur.id && cur.id !== me.id) {
          return; // abort — taken by someone else
        }
        return {
          id: me.id,
          name: me.name,
          avatarId: me.avatarId,
          joinedAt: Date.now()
        };
      })
      .then((res) => !!(res && res.committed));
  }

  /* Atomic release — only removes the slot if it belongs to meId. */
  function release(team, key, meId) {
    return slotRef(team, key)
      .transaction((cur) => {
        if (cur && cur.id === meId) return null;
        return; // abort — not mine
      })
      .then((res) => !!(res && res.committed));
  }

  /* ============================================================
     Data queries
     ============================================================ */
  function findPlacement(data, playerId) {
    const teams = ['blue', 'orange'];
    for (let t = 0; t < teams.length; t++) {
      const team = teams[t];
      for (let k = 0; k < ALL_KEYS.length; k++) {
        const slot = data[team] && data[team][ALL_KEYS[k]];
        if (slot && slot.id === playerId) {
          return { team: team, key: ALL_KEYS[k], slot: slot };
        }
      }
    }
    return null;
  }

  function fieldCount(data, team) {
    return FIELD_KEYS.reduce((n, k) => n + (data[team] && data[team][k] ? 1 : 0), 0);
  }

  function benchCount(data, team) {
    return BENCH_KEYS.reduce((n, k) => n + (data[team] && data[team][k] ? 1 : 0), 0);
  }

  function isFull(data, team) {
    return fieldCount(data, team) === MAX_FIELD && benchCount(data, team) === MAX_BENCH;
  }

  function firstOpenSlot(data, team) {
    for (let i = 0; i < FIELD_KEYS.length; i++) {
      if (!(data[team] && data[team][FIELD_KEYS[i]])) return FIELD_KEYS[i];
    }
    for (let i = 0; i < BENCH_KEYS.length; i++) {
      if (!(data[team] && data[team][BENCH_KEYS[i]])) return BENCH_KEYS[i];
    }
    return null;
  }

  function isBenchKey(key) {
    return BENCH_KEYS.indexOf(key) > -1;
  }

  function shortTeam(team) {
    return TEAMS[team].name.replace(' Team', '');
  }

  /* ============================================================
     Actions
     ============================================================ */
  function ensureReady() {
    if (!db) {
      toast('You are offline. Reconnect to join the live match.');
      return false;
    }
    return true;
  }

  function me() {
    return typeof getActivePlayer === 'function' ? getActivePlayer() : null;
  }

  function announceJoin(team, key, person) {
    if (isBenchKey(key)) {
      toast(person.name + ' joined the ' + shortTeam(team) + ' bench.');
    } else {
      toast(person.name + ' joined ' + TEAMS[team].name + ' as ' + LABELS[key] + '!');
    }
  }

  function joinTeam(team, person) {
    if (!ensureReady()) return Promise.resolve(false);
    return readLatest().then((data) => {
      const mine = findPlacement(data, person.id);
      if (mine && mine.team === team) {
        toast('You already play for the ' + TEAMS[team].name + '.');
        return false;
      }
      if (isFull(data, team)) {
        toast(TEAMS[team].name + ' is full! Try the other team.');
        return false;
      }
      const key = firstOpenSlot(data, team);
      if (!key) {
        toast(TEAMS[team].name + ' is full! Try the other team.');
        return false;
      }
      return tryOccupy(team, key, person).then((ok) => {
        if (!ok) {
          toast('This spot is already taken!');
          return false;
        }
        const finish = mine ? release(mine.team, mine.key, person.id) : Promise.resolve();
        return finish.then(() => {
          announceJoin(team, key, person);
          return true;
        });
      });
    });
  }

  function joinSlot(team, key, person) {
    if (!ensureReady()) return Promise.resolve(false);
    return tryOccupy(team, key, person).then((ok) => {
      if (!ok) {
        toast('This spot is already taken!');
        return false;
      }
      return readLatest().then((data) => {
        const others = [];
        ['blue', 'orange'].forEach((t) => {
          ALL_KEYS.forEach((k) => {
            const slot = data[t] && data[t][k];
            if (slot && slot.id === person.id && !(t === team && k === key)) {
              others.push(release(t, k, person.id));
            }
          });
        });
        return Promise.all(others).then(() => {
          announceJoin(team, key, person);
          return true;
        });
      });
    });
  }

  function leaveSlot(team, key, person) {
    if (!ensureReady()) return Promise.resolve(false);
    return readLatest().then((data) => {
      const slot = data[team] && data[team][key];
      if (!slot || !slot.id) {
        toast('This spot is already empty.');
        return false;
      }
      if (slot.id !== person.id) {
        toast('You can only leave your own spot.');
        return false;
      }
      return release(team, key, person.id).then(() => {
        toast('You left the match.');
        return true;
      });
    });
  }

  function leaveMatch(person) {
    if (!ensureReady()) return Promise.resolve(false);
    return readLatest().then((data) => {
      const mine = findPlacement(data, person.id);
      if (!mine) {
        toast('You are not in this match yet.');
        return false;
      }
      return release(mine.team, mine.key, person.id).then(() => {
        toast('You left the match.');
        return true;
      });
    });
  }

  /* ============================================================
     Rendering — pitch & bench
     ============================================================ */
  function render() {
    renderPitch();
    renderBench();
    renderJoinPanel();
    updateConn();
  }

  function isActivePlayer(id) {
    const active = me();
    return !!(active && active.id === id);
  }

  function renderPitch() {
    dom.pitchSlots.innerHTML = '';
    ['orange', 'blue'].forEach((team) => {
      FIELD_SLOTS.forEach((def) => {
        dom.pitchSlots.appendChild(buildFieldSlot(team, def));
      });
    });
  }

  function buildFieldSlot(team, def) {
    const slot = lineupData[team] && lineupData[team][def.key];
    const y = team === 'blue' ? def.y : 100 - def.y;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'slot t-' + team +
      (slot ? ' slot--filled' : ' slot--empty') +
      (slot && isActivePlayer(slot.id) ? ' slot--you' : '');
    btn.style.left = def.x + '%';
    btn.style.top = y + '%';
    btn.setAttribute(
      'aria-label',
      TEAMS[team].name + ' ' + def.label + (slot ? ': ' + slot.name : ' (empty)')
    );

    if (slot) {
      btn.innerHTML =
        '<span class="slot__ring">' +
        renderAvatarSVG(getAvatar(slot.avatarId), 'slot-' + team + '-' + def.key) +
        '</span>' +
        '<span class="slot__label">' + escapeHtml(slot.name) + '</span>';
    } else {
      btn.innerHTML =
        '<span class="slot__ring"><span class="plus">+</span></span>' +
        '<span class="slot__label">' + def.label + '</span>';
    }

    btn.addEventListener('click', () => openSlotSheet(team, def.key));
    return btn;
  }

  function renderBench() {
    dom.bench.innerHTML = '';
    ['blue', 'orange'].forEach((team) => {
      const col = document.createElement('div');
      col.className = 'bench__col t-' + team;

      const head = document.createElement('div');
      head.className = 'bench__head';
      head.innerHTML = '<i></i>' + TEAMS[team].name + ' subs';
      col.appendChild(head);

      const slots = document.createElement('div');
      slots.className = 'bench__slots';

      BENCH_SLOTS.forEach((def) => {
        const slot = lineupData[team] && lineupData[team][def.key];

        const b = document.createElement('button');
        b.type = 'button';
        b.className =
          'bench-slot t-' + team +
          (slot ? ' bench-slot--filled' : ' bench-slot--empty') +
          (slot && isActivePlayer(slot.id) ? ' bench-slot--you' : '');
        b.setAttribute(
          'aria-label',
          TEAMS[team].name + ' ' + def.label + (slot ? ': ' + slot.name : ' (empty)')
        );

        if (slot) {
          b.innerHTML =
            '<span class="bench-slot__ring">' +
            renderAvatarSVG(getAvatar(slot.avatarId), 'bench-' + team + '-' + def.key) +
            '</span>' +
            '<span class="bench-slot__name">' + escapeHtml(slot.name) + '</span>';
        } else {
          b.innerHTML =
            '<span class="bench-slot__ring"><span class="plus">+</span></span>' +
            '<span class="bench-slot__name">' + def.label + '</span>';
        }

        b.addEventListener('click', () => openSlotSheet(team, def.key));
        slots.appendChild(b);
      });

      col.appendChild(slots);
      dom.bench.appendChild(col);
    });
  }

  /* ============================================================
     Join panel
     ============================================================ */
  function renderJoinPanel() {
    if (!dom.joinPanel) return;
    dom.joinPanel.innerHTML = '';

    const person = me();
    if (!person) return;

    if (!db) {
      const off = document.createElement('div');
      off.className = 'join-cta is-offline';
      off.innerHTML =
        '<div class="join-cta__text">' +
        '<strong>You are offline</strong>' +
        '<span>Connect to the internet to see the live lineup and claim a spot.</span>' +
        '</div>';
      dom.joinPanel.appendChild(off);
      return;
    }

    const placement = findPlacement(lineupData, person.id);

    if (!placement) {
      const cta = document.createElement('div');
      cta.className = 'join-cta';
      cta.innerHTML =
        '<div class="join-cta__text">' +
        '<strong>Ready to play?</strong>' +
        '<span>Pick a team and take your spot on the pitch.</span>' +
        '</div>';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--primary';
      btn.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>' +
        'Join the match';
      btn.addEventListener('click', openTeamChoice);
      cta.appendChild(btn);
      dom.joinPanel.appendChild(cta);
      return;
    }

    const card = document.createElement('div');
    card.className = 'join-status t-' + placement.team;
    card.innerHTML =
      '<span class="join-status__dot"></span>' +
      '<div class="join-status__info">' +
      '<strong>You are on ' + TEAMS[placement.team].name + '</strong>' +
      '<span>Position: ' + NAMES[placement.key] + '</span>' +
      '</div>';

    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'btn btn--danger join-status__btn';
    leave.textContent = 'Leave';
    leave.addEventListener('click', () => leaveMatch(person));
    card.appendChild(leave);
    dom.joinPanel.appendChild(card);
  }

  /* ============================================================
     Bottom sheet — team choice
     ============================================================ */
  function openSheet(mode) {
    sheetMode = mode;
    dom.sheet.classList.add('is-open');
  }

  function closeSheet() {
    dom.sheet.classList.remove('is-open');
    sheetMode = null;
    currentSlot = null;
  }

  function openTeamChoice() {
    const person = me();
    if (!person) return;

    dom.sheetEyebrow.textContent = 'Join match';
    dom.sheetTitle.textContent = 'Choose your team';
    dom.sheetBody.innerHTML = '<p class="sheet-empty">Loading the current lineup…</p>';
    dom.sheetFoot.innerHTML = '';
    openSheet('team');

    readLatest().then((data) => {
      if (sheetMode !== 'team') return; // closed while loading
      renderTeamChoice(data, person);
    });
  }

  function renderTeamChoice(data, person) {
    dom.sheetBody.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'team-choice';

    ['blue', 'orange'].forEach((team) => {
      const full = isFull(data, team);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'team-choice__btn t-' + team + (full ? ' is-full' : '');
      b.setAttribute('aria-disabled', String(full));
      b.innerHTML =
        '<span class="team-choice__name">' + TEAMS[team].name + '</span>' +
        '<span class="team-choice__meta">' +
        fieldCount(data, team) + '/' + MAX_FIELD + ' on field · ' +
        benchCount(data, team) + '/' + MAX_BENCH + ' subs' +
        '</span>' +
        '<span class="team-choice__badge">' + (full ? 'Team is full' : 'Join') + '</span>';

      b.addEventListener('click', () => {
        joinTeam(team, person).then((ok) => {
          if (ok) closeSheet();
        });
      });
      wrap.appendChild(b);
    });

    dom.sheetBody.appendChild(wrap);
  }

  /* ============================================================
     Bottom sheet — single slot
     ============================================================ */
  function openSlotSheet(team, key) {
    currentSlot = { team: team, key: key };
    dom.sheetEyebrow.textContent = TEAMS[team].name + ' · ' + LABELS[key];
    dom.sheetTitle.textContent = NAMES[key];
    dom.sheetBody.innerHTML = '<p class="sheet-empty">Checking this spot…</p>';
    dom.sheetFoot.innerHTML = '';
    openSheet('slot');

    readLatest().then((data) => {
      if (sheetMode !== 'slot' || !currentSlot) return;
      if (currentSlot.team !== team || currentSlot.key !== key) return;
      renderSlotSheet(data, team, key);
    });
  }

  function renderSlotSheet(data, team, key) {
    const slot = data[team] && data[team][key];
    const person = me();

    dom.sheetBody.innerHTML = '';
    dom.sheetFoot.innerHTML = '';

    if (!slot) {
      const note = document.createElement('p');
      note.className = 'slot-note slot-note--open';
      note.textContent = 'This spot is open. Claim it and it is yours.';
      dom.sheetBody.appendChild(note);

      if (!person) {
        const hint = document.createElement('p');
        hint.className = 'sheet-empty';
        hint.textContent = 'Create your player profile first to claim a spot.';
        dom.sheetBody.appendChild(hint);
        return;
      }

      const join = document.createElement('button');
      join.type = 'button';
      join.className = 'btn btn--primary';
      join.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>' +
        'Join this spot';
      join.addEventListener('click', () => {
        joinSlot(team, key, person).then((ok) => { if (ok) closeSheet(); });
      });
      dom.sheetFoot.appendChild(join);
      return;
    }

    const mine = person && slot.id === person.id;

    const card = document.createElement('div');
    card.className = 'slot-player t-' + team;
    card.innerHTML =
      renderAvatarSVG(getAvatar(slot.avatarId), 'sheet-' + team + '-' + key) +
      '<div class="slot-player__info">' +
      '<span class="slot-player__name">' + escapeHtml(slot.name) + '</span>' +
      '<span class="slot-player__meta">' +
      (mine ? 'That is you on ' + TEAMS[team].name : 'Occupied by another player') +
      '</span>' +
      '</div>';
    dom.sheetBody.appendChild(card);

    if (mine) {
      const note = document.createElement('p');
      note.className = 'slot-note slot-note--you';
      note.textContent = 'This is your spot. You can leave it whenever you want.';
      dom.sheetBody.appendChild(note);

      const leave = document.createElement('button');
      leave.type = 'button';
      leave.className = 'btn btn--danger';
      leave.textContent = 'Leave this spot';
      leave.addEventListener('click', () => {
        leaveSlot(team, key, person).then((ok) => { if (ok) closeSheet(); });
      });
      dom.sheetFoot.appendChild(leave);
    } else {
      const note = document.createElement('p');
      note.className = 'slot-note slot-note--warn';
      note.textContent = 'This spot is already taken!';
      dom.sheetBody.appendChild(note);
    }
  }

  /* ============================================================
     Share Lineup (WhatsApp)
     ============================================================ */
  function buildShareText(data) {
    const lines = ['⚽ *9v9 Match Lineup* ⚽', ''];

    ['blue', 'orange'].forEach((team) => {
      const total = fieldCount(data, team) + benchCount(data, team);
      lines.push(TEAMS[team].emoji + ' *' + TEAMS[team].name + ' (' + total + '/' + MAX_TOTAL + '):*');

      let hasField = false;
      FIELD_SLOTS.forEach((def) => {
        const slot = data[team] && data[team][def.key];
        if (slot) {
          hasField = true;
          lines.push('• ' + slot.name + ' (' + def.label + ')');
        }
      });
      if (!hasField) lines.push('_No players yet_');

      const subs = BENCH_SLOTS
        .map((def) => data[team] && data[team][def.key])
        .filter(Boolean)
        .map((slot) => slot.name);
      if (subs.length) lines.push('_Subs: ' + subs.join(', ') + '_');

      lines.push('');
    });

    lines.push('🔗 *Join the match here:* ' + APP_URL);
    return lines.join('\n');
  }

  function shareLineup() {
    const source = db ? readLatest() : Promise.resolve(normalize(lineupData));
    source.then((data) => {
      const text = buildShareText(data);
      const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ============================================================
     Live sync
     ============================================================ */
  function updateConn() {
    if (!dom.connPill) return;
    dom.connPill.classList.toggle('is-live', connected);
    if (dom.connText) dom.connText.textContent = connected ? 'Live' : 'Offline';
  }

  function startSync() {
    if (!db) {
      connected = false;
      updateConn();
      render();
      return;
    }

    db.ref(PATH).on(
      'value',
      (snap) => {
        lineupData = normalize(snap.val());
        render();
      },
      (err) => {
        console.error('[SquadUp] Lineup sync error:', err);
        toast('Could not load the live lineup.');
      }
    );

    db.ref('.info/connected').on('value', (snap) => {
      connected = !!snap.val();
      updateConn();
    });
  }

  /* ============================================================
     Events
     ============================================================ */
  if (dom.shareBtn) dom.shareBtn.addEventListener('click', shareLineup);
  if (dom.sheetClose) dom.sheetClose.addEventListener('click', closeSheet);
  dom.sheet.querySelectorAll('[data-sheet-close]').forEach((node) => {
    node.addEventListener('click', closeSheet);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.sheet.classList.contains('is-open')) closeSheet();
  });

  /* ============================================================
     Public API + boot
     ============================================================ */
  window.Lineup = {
    render: render,
    buildShareText: buildShareText,
    joinSlot: joinSlot,
    joinTeam: joinTeam,
    leaveSlot: leaveSlot,
    leaveMatch: leaveMatch
  };

  startSync();
})();
