// ─── BIZ HELPER CROWDMAP · APP ────────────────────────────────────────────
// Логика: парсинг, рендеринг, сортировка, tooltip, автообновление
// Зависит от data.js (должен быть подключён раньше)

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

// Строка — данные если в ней есть хотя бы одно число в столбцах 1–9
function isDataRow(row) {
  if (!row[0] || !row[0].trim()) return false;
  return row.slice(1, CRITERIA.length + 1).some(v => v !== '' && !isNaN(parseFloat(v)));
}

// ── Состояние ──────────────────────────────────────────────────────────────

let rawData    = [];   // [{role, vals:[v0..v8]}]
let sortCol    = null; // null=исходный, -1=роль, 0..8=критерий
let sortDir    = null; // 'asc' | 'desc'
let selectedCell = null;

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
    if (isDec) {
      html += `<div class="tip-scale-label">Округлено до ${sign}${r} для расшифровки шкалы</div>`;
    }
    html += `<div class="tip-body">${label || 'Нет расшифровки'}</div>`;
  }
  return html;
}

// ── Рендеринг строк данных ─────────────────────────────────────────────────

function renderRows() {
  const grid = document.getElementById('grid');

  // Удаляем только строки данных — заголовки (первые 10 элементов) не трогаем
  while (grid.children.length > CRITERIA.length + 1) grid.removeChild(grid.lastChild);

  getSorted().forEach(row => {
    // Ячейка с названием роли
    const rc = document.createElement('div');
    rc.className = 'role-cell';
    rc.textContent = row.role;
    grid.appendChild(rc);

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

// ── Построение заголовков и осей ───────────────────────────────────────────

function buildHeaders() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  // Corner — сортировка по алфавиту
  const corner = document.createElement('div');
  corner.className = 'corner-cell';
  corner.id = 'corner-cell';
  corner.title = 'Сортировать по алфавиту';
  corner.innerHTML = `<div class="corner-line1"></div>
    <div class="corner-line2">РОЛЬ <span class="sort-arrow">↕</span></div>`;

  corner.addEventListener('click', () => {
    if (sortCol === -1 && sortDir === 'asc')        setSortState(-1, 'desc');
    else if (sortCol === -1 && sortDir === 'desc')  setSortState(null, null);
    else                                             setSortState(-1, 'asc');
  });
  grid.appendChild(corner);

  // Заголовки критериев — две строки, стрелка всегда в нижней
  CRITERIA.forEach((c, ci) => {
    const words = c.short.split(' ');
    const line1 = words.length > 1 ? words.slice(0, -1).join(' ') : '';
    const line2 = words[words.length - 1];

    const h = document.createElement('div');
    h.className = 'col-header';
    h.id = `hdr-${ci}`;
    h.title = `Сортировать по «${c.short}»`;
    h.innerHTML = `<div class="col-line1">${line1}</div>
      <div class="col-line2"><span>${line2}</span><span class="col-arrow">↕</span></div>`;

    h.addEventListener('click', () => {
      if (sortCol === ci && sortDir === 'desc')     setSortState(ci, 'asc');
      else if (sortCol === ci && sortDir === 'asc') setSortState(null, null);
      else                                           setSortState(ci, 'desc');
    });
    grid.appendChild(h);
  });

  // Подписи осей под таблицей
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

// ── Парсинг данных из CSV ──────────────────────────────────────────────────

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

// ── Легенда критериев ──────────────────────────────────────────────────────

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
    document.getElementById('status-text').textContent = 'Данные загружены';
  } catch (e) {
    document.getElementById('status-text').textContent =
      'Ошибка загрузки — проверьте публикацию таблицы';
  }
}

// ── Инициализация ──────────────────────────────────────────────────────────

window.addEventListener('scroll', () => {
  document.getElementById('back-top')
    .classList.toggle('visible', window.scrollY > 300);
});

buildHeaders();
buildLegend();
loadData();
setInterval(loadData, 300000);
