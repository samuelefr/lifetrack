/* LifeTrack — app.js */

// ─── PALETTE ────────────────────────────────────────────
const COLORS = [
  { hex: '#c8f135', label: 'lime' },
  { hex: '#5b9cf6', label: 'blue' },
  { hex: '#f4845f', label: 'orange' },
  { hex: '#c084fc', label: 'violet' },
  { hex: '#fb7185', label: 'pink' },
  { hex: '#34d399', label: 'green' },
  { hex: '#fbbf24', label: 'yellow' },
  { hex: '#94a3b8', label: 'slate' },
];

// ─── STATE ──────────────────────────────────────────────
let activities = JSON.parse(localStorage.getItem('lt_activities') || '[]');
let selectedDate = todayStr();   // "YYYY-MM-DD"
let editId = null;
let selectedColor = COLORS[0].hex;

// ─── HELPERS ────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}`;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function save() {
  localStorage.setItem('lt_activities', JSON.stringify(activities));
}

// Returns activities visible on a given date
function actsForDate(dateStr) {
  return activities
    .filter(a => a.dateStart <= dateStr && a.dateEnd >= dateStr)
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
}

// Returns all colors used on a date (for dot preview)
function colorsForDate(dateStr) {
  return actsForDate(dateStr).map(a => a.color);
}

// ─── DATE NAV ────────────────────────────────────────────
function buildDateNav() {
  const nav = document.getElementById('dateNav');
  nav.innerHTML = '';
  const today = todayStr();
  const days = [];

  // Show 30 days centered around today (14 before, today, 15 after)
  for (let i = -14; i <= 15; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }

  const WD = ['do', 'lu', 'ma', 'me', 'gi', 've', 'sa'];

  days.forEach(ds => {
    const [, , dd] = ds.split('-');
    const dow = new Date(ds + 'T12:00:00').getDay();
    const chip = document.createElement('div');
    chip.className = 'date-chip' +
      (ds === today ? ' today-chip' : '') +
      (ds === selectedDate ? ' active' : '');
    chip.dataset.date = ds;

    const dots = colorsForDate(ds).slice(0, 3);
    const dotHtml = dots.map(c => `<span class="dot" style="background:${c}"></span>`).join('');

    chip.innerHTML = `
      <span class="wd">${WD[dow]}</span>
      <span class="dd">${parseInt(dd)}</span>
      <span class="dot-row">${dotHtml}</span>
    `;

    chip.addEventListener('click', () => {
      selectedDate = ds;
      buildDateNav();
      renderTimeline();
    });

    nav.appendChild(chip);
  });

  // Scroll selected into view
  const active = nav.querySelector('.active');
  if (active) {
    setTimeout(() => {
      active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// ─── TIMELINE ────────────────────────────────────────────
function renderTimeline() {
  const tl = document.getElementById('timeline');
  const empty = document.getElementById('emptyState');
  const acts = actsForDate(selectedDate);

  // Update today label
  const today = todayStr();
  const label = document.getElementById('todayLabel');
  if (selectedDate === today) {
    label.textContent = 'oggi';
  } else {
    const [y, m, d] = selectedDate.split('-');
    label.textContent = `${d}/${m}/${y}`;
  }

  // Clear existing cards (keep emptyState)
  tl.querySelectorAll('.act-card, .time-group-label').forEach(el => el.remove());

  if (acts.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Group by morning / afternoon / evening / no time
  const groups = { mattina: [], pomeriggio: [], sera: [], tutto: [] };
  acts.forEach(a => {
    if (!a.timeStart) { groups.tutto.push(a); return; }
    const h = parseInt(a.timeStart.split(':')[0]);
    if (h < 13) groups.mattina.push(a);
    else if (h < 18) groups.pomeriggio.push(a);
    else groups.sera.push(a);
  });

  const order = [
    { key: 'tutto',      label: 'tutto il giorno' },
    { key: 'mattina',    label: 'mattina' },
    { key: 'pomeriggio', label: 'pomeriggio' },
    { key: 'sera',       label: 'sera' },
  ];

  order.forEach(({ key, label }) => {
    const list = groups[key];
    if (!list.length) return;

    const groupLabel = document.createElement('div');
    groupLabel.className = 'time-group-label';
    groupLabel.textContent = label;
    tl.appendChild(groupLabel);

    list.forEach(act => {
      const card = buildCard(act);
      tl.appendChild(card);
    });
  });
}

function buildCard(act) {
  const card = document.createElement('div');
  card.className = 'act-card' + (act.done ? ' done' : '');
  card.dataset.id = act.id;

  // Multi-day badge
  const isMulti = act.dateStart !== act.dateEnd;
  const datesHtml = isMulti
    ? `<span class="act-dates">${fmtDate(act.dateStart)}→${fmtDate(act.dateEnd)}</span>`
    : '';

  // Time
  let timeHtml = '';
  if (act.timeStart) {
    timeHtml = `<span class="act-time">${act.timeStart}${act.timeEnd ? ' – ' + act.timeEnd : ''}</span>`;
  }

  // Type badge
  const typeBg = act.color + '22';
  const typeBadge = act.type
    ? `<span class="act-type-badge" style="background:${typeBg};color:${act.color}">${act.type}</span>`
    : '';

  // Note
  const noteHtml = act.note
    ? `<div class="act-note">${act.note}</div>`
    : '';

  card.innerHTML = `
    <div class="act-bar" style="background:${act.color}"></div>
    <div class="act-body">
      <div class="act-top">
        <span class="act-name">${act.name || 'attività'}</span>
        ${typeBadge}
      </div>
      <div class="act-meta">
        ${timeHtml}
        ${datesHtml}
      </div>
      ${noteHtml}
    </div>
    <button class="btn-done" type="button">${act.done ? 'Annulla' : 'Fatto'}</button>
  `;

  // Tap → edit (solo se non si clicca il bottone)
  card.querySelector('.act-name').addEventListener('click', () => openModal(act.id));

  // Bottone fatto/annulla
  card.querySelector('.btn-done').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDone(act.id);
  });



  return card;
}

function toggleDone(id) {
  const act = activities.find(a => a.id === id);
  if (!act) return;
  act.done = !act.done;
  save();
  renderTimeline();
}

// ─── MODAL ───────────────────────────────────────────────
function openModal(id = null) {
  editId = id;
  const modal = document.getElementById('modal');
  const overlay = document.getElementById('modalOverlay');
  const btnDelete = document.getElementById('btnDelete');
  const title = document.getElementById('modalTitle');

  // Reset form
  document.getElementById('actName').value = '';
  document.getElementById('actType').value = '';
  document.getElementById('actDateStart').value = selectedDate;
  document.getElementById('actDateEnd').value = selectedDate;
  document.getElementById('actTimeStart').value = '';
  document.getElementById('actTimeEnd').value = '';
  document.getElementById('actNote').value = '';

  selectedColor = COLORS[0].hex;
  renderSwatches();

  if (id) {
    const act = activities.find(a => a.id === id);
    if (!act) return;
    title.textContent = 'modifica attività';
    document.getElementById('actName').value = act.name;
    document.getElementById('actType').value = act.type || '';
    document.getElementById('actDateStart').value = act.dateStart;
    document.getElementById('actDateEnd').value = act.dateEnd;
    document.getElementById('actTimeStart').value = act.timeStart || '';
    document.getElementById('actTimeEnd').value = act.timeEnd || '';
    document.getElementById('actNote').value = act.note || '';
    selectedColor = act.color;
    renderSwatches();
    btnDelete.classList.remove('hidden');
  } else {
    title.textContent = 'nuova attività';
    btnDelete.classList.add('hidden');
  }

  overlay.classList.add('open');
  document.getElementById('actName').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editId = null;
}

function saveActivity() {
  const name = document.getElementById('actName').value.trim();
  if (!name) {
    document.getElementById('actName').focus();
    document.getElementById('actName').style.borderColor = '#e05a5a';
    setTimeout(() => document.getElementById('actName').style.borderColor = '', 1200);
    return;
  }

  const dateStart = document.getElementById('actDateStart').value || selectedDate;
  let dateEnd = document.getElementById('actDateEnd').value || dateStart;
  if (dateEnd < dateStart) dateEnd = dateStart;

  const act = {
    id: editId || genId(),
    name,
    type: document.getElementById('actType').value.trim(),
    color: selectedColor,
    dateStart,
    dateEnd,
    timeStart: document.getElementById('actTimeStart').value,
    timeEnd: document.getElementById('actTimeEnd').value,
    note: document.getElementById('actNote').value.trim(),
    done: false,
  };

  if (editId) {
    const idx = activities.findIndex(a => a.id === editId);
    if (idx > -1) {
      act.done = activities[idx].done;
      activities[idx] = act;
    }
  } else {
    activities.push(act);
  }

  save();
  closeModal();
  buildDateNav();
  renderTimeline();
}

function deleteActivity() {
  if (!editId) return;
  activities = activities.filter(a => a.id !== editId);
  save();
  closeModal();
  buildDateNav();
  renderTimeline();
}

// ─── SWATCHES ────────────────────────────────────────────
function renderSwatches() {
  const container = document.getElementById('colorSwatches');
  container.innerHTML = '';
  COLORS.forEach(c => {
    const sw = document.createElement('button');
    sw.className = 'swatch' + (c.hex === selectedColor ? ' selected' : '');
    sw.style.background = c.hex;
    sw.title = c.label;
    sw.setAttribute('type', 'button');
    sw.addEventListener('click', () => {
      selectedColor = c.hex;
      renderSwatches();
    });
    container.appendChild(sw);
  });
}

// ─── EVENTS ──────────────────────────────────────────────
document.getElementById('btnAdd').addEventListener('click', () => openModal());
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnSave').addEventListener('click', saveActivity);
document.getElementById('btnDelete').addEventListener('click', deleteActivity);

// Close on overlay tap
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ESC key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && document.getElementById('modalOverlay').classList.contains('open')) {
    saveActivity();
  }
});

// dateEnd always >= dateStart
document.getElementById('actDateStart').addEventListener('change', () => {
  const s = document.getElementById('actDateStart').value;
  const e = document.getElementById('actDateEnd').value;
  if (!e || e < s) document.getElementById('actDateEnd').value = s;
});

// ─── INIT ────────────────────────────────────────────────
buildDateNav();
renderTimeline();