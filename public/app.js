const state = {
  token: localStorage.getItem('token') || '',
  charts: {},
};

const els = {
  app: document.getElementById('app'),
  loginScreen: document.getElementById('loginScreen'),
  loginForm: document.getElementById('loginForm'),
  loginError: document.getElementById('loginError'),
  kpiCards: document.getElementById('kpiCards'),
  contractsTable: document.getElementById('contractsTable'),
  pendenciasTable: document.getElementById('pendenciasTable'),
  rankingCards: document.getElementById('rankingCards'),
  tasksList: document.getElementById('tasksList'),
  todayTasks: document.getElementById('todayTasks'),
};

const api = async (url, options = {}) => {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${state.token}`,
    'Content-Type': 'application/json',
  };

  if (options.raw) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    logout();
    throw new Error('Sessão expirada.');
  }
  if (!response.ok) {
    throw new Error('Falha na requisição.');
  }
  return options.raw ? response : response.json();
};

const toggleTheme = () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

document.getElementById('themeToggle').onclick = toggleTheme;
document.getElementById('logoutBtn').onclick = () => logout();

const logout = () => {
  state.token = '';
  localStorage.removeItem('token');
  els.app.classList.add('hidden');
  els.loginScreen.classList.remove('hidden');
};

const setAuth = () => {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') document.body.classList.add('dark');

  if (state.token) {
    els.loginScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    loadAll();
  }
};

els.loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());

  try {
    const result = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((r) => r.json());

    if (!result.token) throw new Error(result.message || 'Login inválido');
    state.token = result.token;
    localStorage.setItem('token', result.token);
    els.loginScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    e.target.reset();
    loadAll();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
};

const statusBadge = (status) => `<span class="status">${status}</span>`;

const renderDashboard = async () => {
  const data = await api('/api/dashboard');
  const i = data.indicadores;
  els.kpiCards.innerHTML = `
    <div class="card">Total de contratos<strong>${i.totalContratos}</strong></div>
    <div class="card">Em análise<strong>${i.emAnalise}</strong></div>
    <div class="card">Pendências abertas<strong>${i.pendenciasAbertas}</strong></div>
    <div class="card">Aprovados<strong>${i.aprovados}</strong></div>
    <div class="card">Tarefas do dia<strong>${i.tarefasDoDia}</strong></div>
  `;

  const contractsCtx = document.getElementById('contractsChart');
  const pendCtx = document.getElementById('pendenciasChart');

  Object.values(state.charts).forEach((chart) => chart.destroy());
  state.charts.contracts = new Chart(contractsCtx, {
    type: 'bar',
    data: {
      labels: data.graficos.contractsStatus.map((x) => x.status),
      datasets: [{ label: 'Contratos', data: data.graficos.contractsStatus.map((x) => x.quantidade) }],
    },
  });

  state.charts.pendencias = new Chart(pendCtx, {
    type: 'doughnut',
    data: {
      labels: data.graficos.pendenciasPorPrioridade.map((x) => x.prioridade),
      datasets: [{ label: 'Pendências', data: data.graficos.pendenciasPorPrioridade.map((x) => x.quantidade) }],
    },
  });
};

const loadContracts = async () => {
  const params = new URLSearchParams({
    corretor: document.getElementById('filterCorretor').value,
    status: document.getElementById('filterStatus').value,
    dataInicio: document.getElementById('filterDataInicio').value,
    dataFim: document.getElementById('filterDataFim').value,
    search: document.getElementById('searchContract').value,
  });

  const data = await api(`/api/contracts?${params.toString()}`);
  els.contractsTable.innerHTML = data.map((row) => `
    <tr>
      <td>${row.nome_cliente}</td>
      <td>${row.corretor}</td>
      <td>${row.operadora}</td>
      <td>${row.tipo_plano}</td>
      <td>${row.data_envio}</td>
      <td>${statusBadge(row.status)}</td>
      <td>${row.observacoes || '-'}</td>
    </tr>
  `).join('');
};

document.getElementById('applyFilters').onclick = (e) => {
  e.preventDefault();
  loadContracts();
};

document.getElementById('contractForm').onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  await api('/api/contracts', { method: 'POST', body: JSON.stringify(data) });
  e.target.reset();
  loadAll();
};

const loadPendencias = async () => {
  const data = await api('/api/pendencias');
  els.pendenciasTable.innerHTML = data.map((row) => `
    <tr class="${row.atrasada ? 'atrasada' : ''}">
      <td>${row.cliente}</td>
      <td>${row.corretor}</td>
      <td>${row.tipo_pendencia}</td>
      <td>${row.descricao}</td>
      <td>${row.prioridade}</td>
      <td>${row.prazo}</td>
      <td>${statusBadge(row.status)}</td>
    </tr>
  `).join('');
};

document.getElementById('pendenciaForm').onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  await api('/api/pendencias', { method: 'POST', body: JSON.stringify(data) });
  e.target.reset();
  loadAll();
};

const loadRanking = async () => {
  const data = await api('/api/ranking');
  els.rankingCards.innerHTML = data.map((r, idx) => `
    <article class="rank-card">
      <strong>#${idx + 1} ${r.corretor}</strong>
      <p>Total: ${r.total}</p>
      <p>Aprovados: ${r.aprovados} | Pendentes: ${r.pendentes} | Cancelados: ${r.cancelados}</p>
    </article>
  `).join('');
};

const loadTasks = async () => {
  const data = await api('/api/tasks');
  const today = new Date().toISOString().slice(0, 10);

  els.tasksList.innerHTML = data.map((task) => `
    <li>
      <label>
        <input type="checkbox" ${task.concluida ? 'checked' : ''} data-task-id="${task.id}" />
        ${task.data} ${task.horario} - ${task.titulo} (${task.prioridade})
      </label>
    </li>
  `).join('');

  const todayTasks = data.filter((task) => task.data === today);
  els.todayTasks.innerHTML = todayTasks.length
    ? todayTasks.map((task) => `<span class="today-pill">${task.horario} • ${task.titulo}</span>`).join('')
    : '<span class="today-pill">Sem tarefas para hoje</span>';

  document.querySelectorAll('[data-task-id]').forEach((checkbox) => {
    checkbox.onchange = async (e) => {
      await api(`/api/tasks/${e.target.dataset.taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ concluida: e.target.checked }),
      });
      loadTasks();
    };
  });
};

document.getElementById('taskForm').onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  await api('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
  e.target.reset();
  loadAll();
};

const handleExport = async (endpoint, filename) => {
  const response = await api(endpoint, { raw: true });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

document.getElementById('exportContracts').onclick = () => handleExport('/api/export/contracts', 'contratos.csv');
document.getElementById('exportPendencias').onclick = () => handleExport('/api/export/pendencias', 'pendencias.csv');

const loadAll = async () => {
  await Promise.all([
    renderDashboard(),
    loadContracts(),
    loadPendencias(),
    loadRanking(),
    loadTasks(),
  ]);
};

setAuth();
