const STORAGE_KEY = 'gastosFamiliares.expenses';
const BUDGET_KEY = 'gastosFamiliares.budgets';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const CATEGORY_COLORS = {
  'Alimentación': '#2563eb',
  'Vivienda': '#7c3aed',
  'Transporte': '#0891b2',
  'Salud': '#dc2626',
  'Educación': '#059669',
  'Entretenimiento': '#d97706',
  'Servicios': '#4f46e5',
  'Ropa': '#db2777',
  'Otros': '#6b7280'
};

let expenses = loadExpenses();
let budgets = loadBudgets();
let currentDate = new Date();
currentDate.setDate(1);

const els = {
  form: document.getElementById('expenseForm'),
  descripcion: document.getElementById('descripcion'),
  monto: document.getElementById('monto'),
  categoria: document.getElementById('categoria'),
  miembro: document.getElementById('miembro'),
  fecha: document.getElementById('fecha'),
  miembrosList: document.getElementById('miembrosList'),
  monthLabel: document.getElementById('currentMonthLabel'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  totalMes: document.getElementById('totalMes'),
  restanteMes: document.getElementById('restanteMes'),
  presupuestoInput: document.getElementById('presupuestoInput'),
  categoryBreakdown: document.getElementById('categoryBreakdown'),
  tableBody: document.getElementById('expenseTableBody'),
  emptyTableMsg: document.getElementById('emptyTableMsg'),
  filterCategoria: document.getElementById('filterCategoria'),
  filterMiembro: document.getElementById('filterMiembro'),
  exportBtn: document.getElementById('exportBtn'),
  clearMonthBtn: document.getElementById('clearMonthBtn'),
};

function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function loadBudgets() {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getExpensesForMonth(key) {
  return expenses.filter(e => e.fecha.startsWith(key));
}

function renderMonthLabel() {
  els.monthLabel.textContent = `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

function renderFilters(monthExpenses) {
  const categorias = [...new Set(monthExpenses.map(e => e.categoria))].sort();
  const miembros = [...new Set(monthExpenses.map(e => e.miembro).filter(Boolean))].sort();

  const prevCategoria = els.filterCategoria.value;
  const prevMiembro = els.filterMiembro.value;

  els.filterCategoria.innerHTML = '<option value="">Todas las categorías</option>' +
    categorias.map(c => `<option value="${c}">${c}</option>`).join('');
  els.filterMiembro.innerHTML = '<option value="">Todos los miembros</option>' +
    miembros.map(m => `<option value="${m}">${m}</option>`).join('');

  if (categorias.includes(prevCategoria)) els.filterCategoria.value = prevCategoria;
  if (miembros.includes(prevMiembro)) els.filterMiembro.value = prevMiembro;

  const allMiembros = [...new Set(expenses.map(e => e.miembro).filter(Boolean))].sort();
  els.miembrosList.innerHTML = allMiembros.map(m => `<option value="${m}"></option>`).join('');
}

function renderSummary(monthExpenses) {
  const total = monthExpenses.reduce((sum, e) => sum + e.monto, 0);
  els.totalMes.textContent = formatCurrency(total);

  const key = monthKey(currentDate);
  const budget = budgets[key] || 0;
  els.presupuestoInput.value = budget || '';

  const restante = budget - total;
  els.restanteMes.textContent = formatCurrency(restante);
  els.restanteMes.classList.toggle('over-budget', budget > 0 && restante < 0);
}

function renderCategoryBreakdown(monthExpenses) {
  if (monthExpenses.length === 0) {
    els.categoryBreakdown.innerHTML = '<p class="empty-msg">Sin gastos registrados este mes.</p>';
    return;
  }

  const total = monthExpenses.reduce((sum, e) => sum + e.monto, 0);
  const byCategory = {};
  monthExpenses.forEach(e => {
    byCategory[e.categoria] = (byCategory[e.categoria] || 0) + e.monto;
  });

  const rows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount]) => {
      const pct = total > 0 ? (amount / total) * 100 : 0;
      const color = CATEGORY_COLORS[cat] || '#6b7280';
      return `
        <div class="category-row">
          <div class="category-row-top">
            <span>${cat}</span>
            <span>${formatCurrency(amount)} (${pct.toFixed(0)}%)</span>
          </div>
          <div class="category-bar-bg">
            <div class="category-bar-fill" style="width:${pct}%; background:${color}"></div>
          </div>
        </div>
      `;
    }).join('');

  els.categoryBreakdown.innerHTML = rows;
}

function renderTable(monthExpenses) {
  const filterCat = els.filterCategoria.value;
  const filterMiembro = els.filterMiembro.value;

  let filtered = monthExpenses;
  if (filterCat) filtered = filtered.filter(e => e.categoria === filterCat);
  if (filterMiembro) filtered = filtered.filter(e => e.miembro === filterMiembro);

  filtered = [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (filtered.length === 0) {
    els.tableBody.innerHTML = '';
    els.emptyTableMsg.hidden = false;
    return;
  }

  els.emptyTableMsg.hidden = true;
  els.tableBody.innerHTML = filtered.map(e => `
    <tr>
      <td>${formatDate(e.fecha)}</td>
      <td>${escapeHtml(e.descripcion)}</td>
      <td>${escapeHtml(e.categoria)}</td>
      <td>${escapeHtml(e.miembro || '-')}</td>
      <td>${formatCurrency(e.monto)}</td>
      <td><button class="delete-btn" data-id="${e.id}" aria-label="Eliminar">🗑</button></td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  renderMonthLabel();
  const key = monthKey(currentDate);
  const monthExpenses = getExpensesForMonth(key);
  renderFilters(monthExpenses);
  renderSummary(monthExpenses);
  renderCategoryBreakdown(monthExpenses);
  renderTable(monthExpenses);
}

els.form.addEventListener('submit', (evt) => {
  evt.preventDefault();
  const monto = parseFloat(els.monto.value);
  if (!monto || monto <= 0) return;

  expenses.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    descripcion: els.descripcion.value.trim() || 'Sin descripción',
    monto,
    categoria: els.categoria.value,
    miembro: els.miembro.value.trim(),
    fecha: els.fecha.value,
  });

  saveExpenses();
  els.form.reset();
  els.fecha.value = todayIso();
  render();
});

els.tableBody.addEventListener('click', (evt) => {
  const btn = evt.target.closest('.delete-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  render();
});

els.prevMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  render();
});

els.nextMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  render();
});

els.presupuestoInput.addEventListener('input', () => {
  const key = monthKey(currentDate);
  const value = parseFloat(els.presupuestoInput.value);
  if (!isNaN(value) && value >= 0) {
    budgets[key] = value;
  } else {
    delete budgets[key];
  }
  saveBudgets();
  renderSummary(getExpensesForMonth(key));
});

els.filterCategoria.addEventListener('change', () => renderTable(getExpensesForMonth(monthKey(currentDate))));
els.filterMiembro.addEventListener('change', () => renderTable(getExpensesForMonth(monthKey(currentDate))));

els.clearMonthBtn.addEventListener('click', () => {
  const key = monthKey(currentDate);
  if (!confirm(`¿Borrar todos los gastos de ${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}?`)) return;
  expenses = expenses.filter(e => !e.fecha.startsWith(key));
  saveExpenses();
  render();
});

els.exportBtn.addEventListener('click', () => {
  const key = monthKey(currentDate);
  const monthExpenses = getExpensesForMonth(key);
  if (monthExpenses.length === 0) {
    alert('No hay gastos para exportar en este mes.');
    return;
  }
  const header = 'Fecha,Descripción,Categoría,Miembro,Monto\n';
  const rows = monthExpenses
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(e => [e.fecha, e.descripcion, e.categoria, e.miembro, e.monto]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gastos-${key}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

els.fecha.value = todayIso();
render();
