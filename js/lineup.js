/* ============================================================
   SquadUp — Match lineup & pitch (Phase 2)
   Renders a responsive 9 v 9 pitch (+2 subs per side) and lets
   players be assigned to any slot from the created profiles.
   Lineup state persists in localStorage.
   ============================================================ */

(function () {
  'use strict';

  const LINEUP_KEY = 'squadup.lineup';

  const TEAMS = {
    blue: { id: 'blue', name: 'Blue Team' },
    orange: { id: 'orange', name: 'Orange Team' }
  };

  /* 1-3-3-2 formation, coordinates are percentages of the pitch
     for the team defending the bottom half. Orange is mirrored. */
  const FIELD_SLOTS = [
    { key: 'gk', label: 'GK', x: 50, y: 90 },
    { key: 'lb', label: 'LB', x: 22, y: 77 },
    { key: 'cb', label: 'CB', x: 50, y: 77 },
    { key: 'rb', label: 'RB', x: 78, y: 77 },
    { key: 'lm', label: 'LM', x: 24, y: 62 },
    { key: 'cm', label: 'CM', x: 50, y: 62 },
    { key: 'rm', label: 'RM', x: 76, y: 62 },
    { key: 'ls', label: 'ST', x: 38, y: 42 },
    { key: 'rs', label: 'ST', x: 62, y: 42 }
  ];

  const BENCH_SLOTS = [
    { key: 'sub1', label: 'SUB 1' },
    { key: 'sub2', label: 'SUB 2' }
  ];

  const ALL_KEYS = FIELD_SLOTS.map((s) => s.key).concat(BENCH_SLOTS.map((s) => s.key));

  let lineup = { blue: {}, orange: {} };
  let current = null;       // slot currently open in the picker
  let pendingAssign = null; // slot waiting for a brand-new player

  const dom = {
    pitchSlots: document.getElementById('pitch-slots'),
    bench: document.getElementById('bench'),
    sheet: document.getElementById('sheet'),
    sheetEyebrow: document.getElementById('sheet-eyebrow'),
    sheetTitle: document.getElementById('sheet-title'),
    sheetBody: document.getElementById('sheet-body'),
    sheetFoot: document.getElementById('sheet-foot'),
    sheetClose: document.getElementById('sheet-close')
  };

  /* ---------- Persistence ---------- */
  function loadLineup() {
    try {
      const raw = JSON.parse(localStorage.getItem(LINEUP_KEY));
      if (raw && raw.blue && raw.orange) {
        lineup = { blue: Object.assign({}, raw.blue), orange: Object.assign({}, raw.orange) };
      }
    } catch (err) {
      lineup = { blue: {}, orange: {} };
    }
    pruneLineup();
  }

  /* Drop references to players that no longer exist. */
  function pruneLineup() {
    ['blue', 'orange'].forEach((team) => {
      ALL_KEYS.forEach((key) => {
        const id = lineup[team][key];
        if (id && !getUser(id)) delete lineup[team][key];
      });
    });
  }

  function saveLineup() {
    localStorage.setItem(LINEUP_KEY, JSON.stringify(lineup));
  }

  /* ---------- Lookups ---------- */
  function getUser(id) {
    return state.users.find((u) => u.id === id) || null;
  }

  function placementOf(userId) {
    const teams = ['blue', 'orange'];
    for (let t = 0; t < teams.length; t++) {
      const team = teams[t];
      for (let k = 0; k < ALL_KEYS.length; k++) {
        if (lineup[team][ALL_KEYS[k]] === userId) {
          return { team: team, key: ALL_KEYS[k] };
        }
      }
    }
    return null;
  }

  /* ---------- Mutations ---------- */
  function assign(team, key, userId) {
    const existing = placementOf(userId);
    if (existing) delete lineup[existing.team][existing.key];
    lineup[team][key] = userId;
    saveLineup();
    render();
  }

  function clearSlot(team, key) {
    delete lineup[team][key];
    saveLineup();
    render();
  }

  /* ---------- Rendering ---------- */
  function render() {
    renderPitch();
    renderBench();
  }

  function renderPitch() {
    dom.pitchSlots.innerHTML = '';
    const order = ['orange', 'blue'];
    order.forEach((team) => {
      FIELD_SLOTS.forEach((def) => {
        dom.pitchSlots.appendChild(buildFieldSlot(team, def));
      });
    });
  }

  function buildFieldSlot(team, def) {
    const userId = lineup[team][def.key];
    const user = userId ? getUser(userId) : null;
    const y = team === 'blue' ? def.y : 100 - def.y;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot t-' + team + (user ? ' slot--filled' : ' slot--empty');
    btn.style.left = def.x + '%';
    btn.style.top = y + '%';
    btn.setAttribute(
      'aria-label',
      TEAMS[team].name + ' ' + def.label + (user ? ': ' + user.name : ' (empty)')
    );

    if (user) {
      btn.innerHTML =
        '<span class="slot__ring">' +
        renderAvatarSVG(getAvatar(user.avatarId), 'slot-' + team + '-' + def.key) +
        '</span>' +
        '<span class="slot__label">' + escapeHtml(user.name) + '</span>';
    } else {
      btn.innerHTML =
        '<span class="slot__ring"><span class="plus">+</span></span>' +
        '<span class="slot__label">' + def.label + '</span>';
    }

    btn.addEventListener('click', () => openPicker(team, def.key, def.label, false, user));
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
        const userId = lineup[team][def.key];
        const user = userId ? getUser(userId) : null;

        const b = document.createElement('button');
        b.type = 'button';
        b.className =
          'bench-slot t-' + team + (user ? ' bench-slot--filled' : ' bench-slot--empty');
        b.setAttribute(
          'aria-label',
          TEAMS[team].name + ' ' + def.label + (user ? ': ' + user.name : ' (empty)')
        );

        if (user) {
          b.innerHTML =
            '<span class="bench-slot__ring">' +
            renderAvatarSVG(getAvatar(user.avatarId), 'bench-' + team + '-' + def.key) +
            '</span>' +
            '<span class="bench-slot__name">' + escapeHtml(user.name) + '</span>';
        } else {
          b.innerHTML =
            '<span class="bench-slot__ring"><span class="plus">+</span></span>' +
            '<span class="bench-slot__name">' + def.label + '</span>';
        }

        b.addEventListener('click', () => openPicker(team, def.key, def.label, true, user));
        slots.appendChild(b);
      });

      col.appendChild(slots);
      dom.bench.appendChild(col);
    });
  }

  /* ---------- Player picker (bottom sheet) ---------- */
  function openPicker(team, key, label, isBench, user) {
    current = { team: team, key: key };
    dom.sheetEyebrow.textContent = TEAMS[team].name + ' · ' + (isBench ? 'Substitute' : label);
    dom.sheetTitle.textContent = isBench ? 'Choose a substitute' : 'Choose ' + label;

    renderPickerBody(user);

    dom.sheetFoot.innerHTML = '';
    if (user) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn--danger';
      remove.textContent = 'Remove from slot';
      remove.addEventListener('click', () => {
        clearSlot(team, key);
        closeSheet();
        toast('Slot cleared.');
      });
      dom.sheetFoot.appendChild(remove);
    }

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn btn--ghost';
    add.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add new player';
    add.addEventListener('click', () => {
      pendingAssign = { team: team, key: key };
      closeSheet();
      openCreate();
    });
    dom.sheetFoot.appendChild(add);

    dom.sheet.classList.add('is-open');
  }

  function renderPickerBody(slotUser) {
    dom.sheetBody.innerHTML = '';

    if (state.users.length === 0) {
      dom.sheetBody.innerHTML =
        '<p class="sheet-empty">No players yet. Create your first player to build the lineup.</p>';
      return;
    }

    state.users.forEach((u) => {
      const placement = placementOf(u.id);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'player-row';

      let tag = '';
      if (placement) {
        const isHere = slotUser && slotUser.id === u.id;
        tag =
          '<span class="player-row__tag player-row__tag--' + placement.team + '">' +
          (isHere ? 'Here' : TEAMS[placement.team].name.replace(' Team', '')) +
          '</span>';
      }

      row.innerHTML =
        renderAvatarSVG(getAvatar(u.avatarId), 'pick-' + u.id) +
        '<span class="player-row__name">' + escapeHtml(u.name) + '</span>' +
        tag;

      row.addEventListener('click', () => {
        if (!current) return;
        const target = current;
        assign(target.team, target.key, u.id);
        closeSheet();
        toast(u.name + ' added to ' + TEAMS[target.team].name + '.');
      });
      dom.sheetBody.appendChild(row);
    });
  }

  function closeSheet() {
    dom.sheet.classList.remove('is-open');
    current = null;
  }

  /* ---------- Integration with profile creation ---------- */
  function handleNewPlayer(userId) {
    if (!pendingAssign) return false;
    const target = pendingAssign;
    pendingAssign = null;
    assign(target.team, target.key, userId);
    return true;
  }

  function cancelPending() {
    pendingAssign = null;
  }

  /* ---------- Events ---------- */
  dom.sheetClose.addEventListener('click', closeSheet);
  dom.sheet.querySelectorAll('[data-sheet-close]').forEach((node) => {
    node.addEventListener('click', closeSheet);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.sheet.classList.contains('is-open')) closeSheet();
  });

  /* ---------- Public API ---------- */
  window.Lineup = {
    render: render,
    handleNewPlayer: handleNewPlayer,
    cancelPending: cancelPending
  };

  loadLineup();
  render();
})();
