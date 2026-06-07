// © 2026 Елена Безгласная · https://t.me/bezshuma_channel · CC BY-NC-ND 4.0
// ─── BIZ HELPER CROWDMAP · APP ────────────────────────────────────────────

// ── Утилиты ────────────────────────────────────────────────────────────────

function getColor(v) {
  return COLOR_MAP.find(c => v >= c.min) || COLOR_MAP.at(-1);
}

function fmtVal(v) {
  return (v > 0 ? '+' : '') + v.toFixed(2);
}

function roundKey(v) {
  return Math.round(v);
}

function parseCSV(text) {
  return text.trim().split('\n').map(line => {
    const cols = []; let cur = ''; let q = false;
    for (const ch of line) {
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

function isDataRow(row) {
  if (!row[0] || !row[0].trim()) return false;
  return row.slice(1, CRITERIA.length + 1).some(v => v !== '' && !isNaN(parseFloat(v)));
}

// ── Состояние ──────────────────────────────────────────────────────────────

let rawData      = [];
let sortCol      = null;
let sortDir      = null;
let selectedCell = null;
let selectedRoles = [];   // для сравнения

// ── Сортировка ─────────────────────────────────────────────────────────────

function getSorted() {
  if (sortCol === null) return [...rawData];
  return [...rawData].sort((a, b) => {
    if (sortCol === -1) {
      const c = a.role.localeCompare(b.role, 'ru');
      return sortDir === 'asc' ? c : -c;
    }
    const va = a.vals[sortCol] ?? null;
    const vb = b.vals[sortCol] ?? null;
    if (va === null && vb === null) return a.role.localeCompare(b.role, 'ru');
    if (va === null) return 1;
    if (vb === null) return -1;
    const diff = sortDir === 'asc' ? va - vb : vb - va;
    return diff !== 0 ? diff : a.role.localeCompare(b.role, 'ru');
  });
}

function arrowChar(col) {
  if (sortCol !== col) return '↕';
  return sortDir === 'asc' ? '↑' : '↓';
}

function updateArrows() {
  const corner = document.getElementById('corner-cell');
  if (corner) {
    corner.querySelector('.sort-arrow').textContent = arrowChar(-1);
    corner.classList.toggle('sort-asc',  sortCol === -1 && sortDir === 'asc');
    corner.classList.toggle('sort-desc', sortCol === -1 && sortDir === 'desc');
  }
  CRITERIA.forEach((_, ci) => {
    const h = document.getElementById(`hdr-${ci}`);
    if (!h) return;
    h.querySelector('.col-arrow').textContent = arrowChar(ci);
    h.classList.toggle('active',    sortCol === ci);
    h.classList.toggle('sort-asc',  sortCol === ci && sortDir === 'asc');
    h.classList.toggle('sort-desc', sortCol === ci && sortDir === 'desc');
  });
}

function setSortState(col, dir) {
  sortCol = col;
  sortDir = dir;
  updateArrows();
  renderRows();
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function buildTooltip(role, crit, val) {
  const r     = roundKey(val);
  const label = r !== 0 ? (LABELS[crit.short] ? LABELS[crit.short][r] : null) : null;
  const isDec = Math.abs(val - r) > 0.05;
  const sign  = r > 0 ? '+' : '';
  let html = `<div class="tip-meta">${role} · ${crit.short} · ${fmtVal(val)}</div>`;
  if (r === 0) {
    html += `<div class="tip-neutral">Критерий не выражен — роль нейтральна по этому параметру</div>`;
  } else {
    if (isDec) html += `<div class="tip-scale-label">Округлено до ${sign}${r} для расшифровки шкалы</div>`;
    html += `<div class="tip-body">${label || 'Нет расшифровки'}</div>`;
  }
  return html;
}

// ── Карточка роли ──────────────────────────────────────────────────────────

function openRoleCard(roleName) {
  const roleData = ROLES[roleName];
  const rowData  = rawData.find(r => r.role === roleName);
  if (!roleData || !rowData) return;

  let barsHtml = '';
  CRITERIA.forEach((c, ci) => {
    const val = rowData.vals[ci];
    if (val === null) return;
    const col     = getColor(val);
    const r       = roundKey(val);
    const label   = r !== 0 ? (LABELS[c.short] ? LABELS[c.short][r] : '') : 'Критерий не выражен';
    const sign    = val > 0 ? '+' : '';
    // Двусторонний бар: растёт от центра влево (отриц.) или вправо (полож.)
    const halfPct = Math.abs(val) / 3 * 50; // 0–50%
    const isNeg   = val < 0;

    barsHtml += `
      <div class="card-criterion">
        <div class="card-crit-header">
          <span class="card-crit-name">${c.short}</span>
          <span class="card-crit-val" style="color:${col.bg}">${sign}${val.toFixed(2)}</span>
        </div>
        <div class="card-bar-track">
          <div class="card-bar-mid"></div>
          ${isNeg
            ? `<div class="card-bar-fill card-bar-neg" style="width:${halfPct}%;background:${col.bg}"></div>`
            : `<div class="card-bar-fill card-bar-pos" style="width:${halfPct}%;background:${col.bg}"></div>`
          }
        </div>
        <div class="card-crit-label">${label}</div>
        <div class="card-crit-axis">${c.axis}</div>
      </div>`;
  });

  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true">
      <button class="modal-close" onclick="closeModal()" aria-label="Закрыть">✕</button>
      <div class="modal-head">
        <div class="modal-role-name">${roleName}</div>
        <div class="modal-role-en">${roleData.en}</div>
        <div class="modal-motto">${roleData.motto}</div>
      </div>
      <div class="modal-body">
        <p class="modal-desc">${roleData.desc}</p>
        <div class="card-criteria">${barsHtml}</div>
      </div>
    </div>`;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// ── Сравнение ──────────────────────────────────────────────────────────────

function toggleRoleSelect(roleName) {
  const idx = selectedRoles.indexOf(roleName);
  if (idx === -1) {
    if (selectedRoles.length >= 4) return;
    selectedRoles.push(roleName);
  } else {
    selectedRoles.splice(idx, 1);
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  // Обновляем чекбоксы
  document.querySelectorAll('.role-checkbox').forEach(cb => {
    const role = cb.dataset.role;
    cb.classList.toggle('checked', selectedRoles.includes(role));
    cb.closest('.role-cell-wrap')?.classList.toggle('role-selected', selectedRoles.includes(role));
  });

  // Плавающая панель
  const panel = document.getElementById('compare-panel');
  if (selectedRoles.length >= 2) {
    panel.innerHTML = `
      <span class="cp-label">Сравниваем: ${selectedRoles.map(r => `<b>${r}</b>`).join(' · ')}</span>
      <button class="cp-btn cp-btn-gold" onclick="openComparison()">Сравнить</button>
      <button class="cp-btn" onclick="resetSelection()">Сбросить</button>`;
  }
  panel.classList.toggle('active', selectedRoles.length >= 2);
}

function resetSelection() {
  selectedRoles = [];
  updateSelectionUI();
}

function openComparison() {
  const roles = selectedRoles.map(name => rawData.find(r => r.role === name)).filter(Boolean);
  if (roles.length < 2) return;

  // Заголовки столбцов
  let headHtml = '<tr><th class="cmp-crit-col">Критерий</th>';
  roles.forEach(r => { headHtml += `<th class="cmp-role-col">${r.role}</th>`; });
  headHtml += '</tr>';

  // Строки критериев
  let rowsHtml = '';
  CRITERIA.forEach((c, ci) => {
    rowsHtml += `<tr><td class="cmp-crit-name">${c.short}<div class="cmp-axis">${c.axis}</div></td>`;
    roles.forEach(r => {
      const val = r.vals[ci];
      if (val === null) { rowsHtml += `<td class="cmp-cell empty">—</td>`; return; }
      const col  = getColor(val);
      const sign = val > 0 ? '+' : '';
      rowsHtml += `<td class="cmp-cell" style="background:${col.bg};color:${col.fg}">${sign}${val.toFixed(2)}</td>`;
    });
    rowsHtml += '</tr>';
  });

  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal-card modal-compare" role="dialog" aria-modal="true">
      <button class="modal-close" onclick="closeModal()" aria-label="Закрыть">✕</button>
      <div class="modal-head">
        <div class="modal-role-name">Сравнение ролей</div>
        <div class="modal-role-en">${roles.map(r => r.role).join(' · ')}</div>
      </div>
      <div class="modal-body">
        <div class="cmp-table-wrap">
          <table class="cmp-table">
            <thead>${headHtml}</thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  overlay.innerHTML = '';
  document.body.style.overflow = '';
}

// ── Рендеринг строк ────────────────────────────────────────────────────────

function renderRows() {
  const grid = document.getElementById('grid');
  while (grid.children.length > CRITERIA.length + 1) grid.removeChild(grid.lastChild);

  getSorted().forEach(row => {
    const isSelected = selectedRoles.includes(row.role);

    // Обёртка для ячейки роли (чекбокс + название)
    const wrap = document.createElement('div');
    wrap.className = 'role-cell-wrap' + (isSelected ? ' role-selected' : '');

    // Чекбокс
    const cb = document.createElement('div');
    cb.className = 'role-checkbox' + (isSelected ? ' checked' : '');
    cb.dataset.role = row.role;
    cb.title = 'Выбрать для сравнения';
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRoleSelect(row.role);
    });

    // Название роли
    const rc = document.createElement('div');
    rc.className = 'role-cell';
    rc.textContent = row.role;
    rc.title = 'Открыть карточку роли';
    rc.addEventListener('click', () => openRoleCard(row.role));

    wrap.appendChild(cb);
    wrap.appendChild(rc);
    grid.appendChild(wrap);

    // Ячейки значений
    CRITERIA.forEach((c, ci) => {
      const val  = row.vals[ci];
      const cell = document.createElement('div');
      cell.className = 'val-cell' + (val === null ? ' empty' : '');
      const num = document.createElement('span');
      num.className = 'val-num';
      if (val !== null) {
        const col = getColor(val);
        cell.style.background = col.bg;
        num.style.color = col.fg;
        num.textContent = fmtVal(val);
      } else {
        num.textContent = '—';
      }
      cell.appendChild(num);
      cell.addEventListener('click', () => {
        if (selectedCell) selectedCell.classList.remove('selected');
        cell.classList.add('selected');
        selectedCell = cell;
        document.getElementById('tooltip').innerHTML =
          val !== null
            ? buildTooltip(row.role, c, val)
            : `<div class="tip-meta">${row.role} · ${c.short}</div><div class="tip-neutral">Нет данных</div>`;
      });
      grid.appendChild(cell);
    });
  });
}

// ── Заголовки и оси ────────────────────────────────────────────────────────

function buildHeaders() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const corner = document.createElement('div');
  corner.className = 'corner-cell';
  corner.id = 'corner-cell';
  corner.title = 'Сортировать по алфавиту';
  corner.innerHTML = `<div class="corner-line1"></div>
    <div class="corner-line2">Роль <span class="sort-arrow">↕</span></div>`;
  corner.addEventListener('click', () => {
    if (sortCol === -1 && sortDir === 'asc')       setSortState(-1, 'desc');
    else if (sortCol === -1 && sortDir === 'desc') setSortState(null, null);
    else                                            setSortState(-1, 'asc');
  });
  grid.appendChild(corner);

  CRITERIA.forEach((c, ci) => {
    const h = document.createElement('div');
    h.className = 'col-header';
    h.id = `hdr-${ci}`;
    h.title = `Сортировать по «${c.short}»`;
    const breaks = {'Объект работы': 'Объект<br>работы', 'Направление знания': 'Направление<br>знания'};
    const label = breaks[c.short] || c.short;
    h.innerHTML = `<div class="col-line2"><span>${label} <span class="col-arrow">↕</span></span></div>`;
    h.addEventListener('click', () => {
      if (sortCol === ci && sortDir === 'desc')     setSortState(ci, 'asc');
      else if (sortCol === ci && sortDir === 'asc') setSortState(null, null);
      else                                           setSortState(ci, 'desc');
    });
    grid.appendChild(h);
  });

  const axisRow = document.getElementById('axis-row');
  axisRow.innerHTML = '';
  axisRow.appendChild(document.createElement('div'));
  CRITERIA.forEach(c => {
    const al = document.createElement('div');
    al.className = 'axis-label';
    al.textContent = c.axis;
    axisRow.appendChild(al);
  });
}

// ── Парсинг ────────────────────────────────────────────────────────────────

function parseData(rows) {
  rawData = rows
    .slice(1)
    .filter(isDataRow)
    .map(row => ({
      role: row[0],
      vals: CRITERIA.map((_, ci) => {
        const raw = row[ci + 1];
        return (raw !== undefined && raw !== '') ? parseFloat(raw) : null;
      }),
    }));
}

// ── Легенда ────────────────────────────────────────────────────────────────

function buildLegend() {
  const container = document.getElementById('legend-grid');
  if (!container) return;
  CRITERIA.forEach(c => {
    const card = document.createElement('div');
    card.className = 'legend-crit';
    let html = `<div class="legend-crit-name">${c.short}</div>
      <div class="legend-crit-axis">${c.axis}</div>
      <div class="legend-scale">`;
    [3, 2, 1, 0, -1, -2, -3].forEach(v => {
      const cls     = VAL_CLASSES[v] || '';
      const label   = v === 0 ? 'Критерий не выражен' : (LABELS[c.short][v] || '');
      const sign    = v > 0 ? '+' : '';
      const descCls = v === 0 ? 'legend-neutral' : 'legend-desc';
      html += `<div class="legend-row">
        <span class="legend-val ${cls}">${sign}${v}</span>
        <span class="${descCls}">${label}</span>
      </div>`;
    });
    html += '</div>';
    card.innerHTML = html;
    container.appendChild(card);
  });
}

// ── Загрузка данных ────────────────────────────────────────────────────────

async function loadData() {
  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const rows = parseCSV(await res.text());
    parseData(rows);
    renderRows();
    const t = new Date().toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'});
    document.getElementById('status-text').textContent = `Данные обновлены · ${t}`;
  } catch (e) {
    document.getElementById('status-text').textContent =
      'Ошибка загрузки — проверьте публикацию таблицы';
  }
}

// ── Инициализация ──────────────────────────────────────────────────────────

// Закрытие модала по клику на overlay
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

window.addEventListener('scroll', () => {
  document.getElementById('back-top')
    .classList.toggle('visible', window.scrollY > 300);
});

buildHeaders();
buildLegend();
loadData();
setInterval(loadData, 300000);
