const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(__dirname, 'data', 'db.json');

const sessions = new Set();

const today = () => new Date().toISOString().slice(0, 10);
const shiftDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const seedData = {
  users: [{ id: 1, username: 'supervisor', password: '123456', nome: 'Supervisor Comercial' }],
  contracts: [
    { id: 1, nome_cliente: 'Ana Souza', corretor: 'Carlos Mendes', operadora: 'Unimed', tipo_plano: 'Empresarial', data_envio: shiftDays(-3), status: 'em análise', observacoes: 'Aguardando retorno da operadora' },
    { id: 2, nome_cliente: 'Roberto Lima', corretor: 'Fernanda Alves', operadora: 'Amil', tipo_plano: 'Individual', data_envio: shiftDays(-2), status: 'aprovado', observacoes: 'Contrato aprovado sem pendências' },
    { id: 3, nome_cliente: 'Juliana Rocha', corretor: 'Carlos Mendes', operadora: 'Bradesco Saúde', tipo_plano: 'Familiar', data_envio: shiftDays(-1), status: 'pendência', observacoes: 'Faltando comprovante de residência' },
    { id: 4, nome_cliente: 'Paulo Nunes', corretor: 'Mariana Dias', operadora: 'SulAmérica', tipo_plano: 'Empresarial', data_envio: today(), status: 'cancelado', observacoes: 'Cliente desistiu da contratação' }
  ],
  pendencias: [
    { id: 1, cliente: 'Juliana Rocha', corretor: 'Carlos Mendes', tipo_pendencia: 'Documento', descricao: 'Enviar comprovante de residência atualizado', prioridade: 'alta', prazo: shiftDays(-1), status: 'resolvendo' },
    { id: 2, cliente: 'Ana Souza', corretor: 'Carlos Mendes', tipo_pendencia: 'Validação', descricao: 'Confirmar data de vigência', prioridade: 'média', prazo: shiftDays(1), status: 'aguardando operadora' }
  ],
  tasks: [
    { id: 1, titulo: 'Reunião com corretores', prioridade: 'alta', horario: '09:00', data: today(), concluida: false },
    { id: 2, titulo: 'Checar contratos pendentes', prioridade: 'média', horario: '11:30', data: today(), concluida: false }
  ]
};

if (!fs.existsSync(path.dirname(DB_FILE))) fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seedData, null, 2));

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const writeDB = (db) => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
const parseBody = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => resolve(body ? JSON.parse(body) : {}));
});
const auth = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return token && sessions.has(token);
};
const nextId = (arr) => arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : 1;

const serveFile = (req, res, pathname) => {
  const filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath)) {
    res.writeHead(404); return res.end('Not Found');
  }
  const ext = path.extname(filePath);
  const map = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  res.writeHead(200, { 'Content-Type': `${map[ext] || 'text/plain'}; charset=utf-8` });
  res.end(fs.readFileSync(filePath));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = url;

  if (pathname === '/api/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = readDB().users.find((u) => u.username === body.username && u.password === body.password);
    if (!user) return json(res, 401, { message: 'Usuário ou senha inválidos.' });
    const token = Math.random().toString(36).slice(2);
    sessions.add(token);
    return json(res, 200, { token, user: { id: user.id, nome: user.nome, username: user.username } });
  }

  if (pathname.startsWith('/api/') && !auth(req)) return json(res, 401, { message: 'Não autorizado' });

  const db = readDB();

  if (pathname === '/api/contracts' && req.method === 'GET') {
    let items = [...db.contracts];
    const corretor = searchParams.get('corretor');
    const status = searchParams.get('status');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const search = searchParams.get('search');
    if (corretor) items = items.filter((x) => x.corretor === corretor);
    if (status) items = items.filter((x) => x.status === status);
    if (dataInicio) items = items.filter((x) => x.data_envio >= dataInicio);
    if (dataFim) items = items.filter((x) => x.data_envio <= dataFim);
    if (search) items = items.filter((x) => x.nome_cliente.toLowerCase().includes(search.toLowerCase()));
    return json(res, 200, items.sort((a, b) => b.data_envio.localeCompare(a.data_envio)));
  }

  if (pathname === '/api/contracts' && req.method === 'POST') {
    const body = await parseBody(req);
    db.contracts.push({ id: nextId(db.contracts), ...body });
    writeDB(db);
    return json(res, 201, { ok: true });
  }

  if (pathname === '/api/pendencias' && req.method === 'GET') {
    const t = today();
    return json(res, 200, db.pendencias.map((p) => ({ ...p, atrasada: p.status !== 'resolvido' && p.prazo < t })));
  }

  if (pathname === '/api/pendencias' && req.method === 'POST') {
    const body = await parseBody(req);
    db.pendencias.push({ id: nextId(db.pendencias), ...body });
    writeDB(db);
    return json(res, 201, { ok: true });
  }

  if (pathname === '/api/tasks' && req.method === 'GET') return json(res, 200, db.tasks);
  if (pathname === '/api/tasks' && req.method === 'POST') {
    const body = await parseBody(req);
    db.tasks.push({ id: nextId(db.tasks), ...body, concluida: false });
    writeDB(db);
    return json(res, 201, { ok: true });
  }

  if (pathname.startsWith('/api/tasks/') && req.method === 'PATCH') {
    const id = Number(pathname.split('/').pop());
    const body = await parseBody(req);
    db.tasks = db.tasks.map((t) => t.id === id ? { ...t, concluida: !!body.concluida } : t);
    writeDB(db);
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/ranking' && req.method === 'GET') {
    const grouped = {};
    db.contracts.forEach((c) => {
      grouped[c.corretor] ||= { corretor: c.corretor, total: 0, aprovados: 0, pendentes: 0, cancelados: 0 };
      grouped[c.corretor].total += 1;
      if (c.status === 'aprovado') grouped[c.corretor].aprovados += 1;
      if (c.status === 'pendência') grouped[c.corretor].pendentes += 1;
      if (c.status === 'cancelado') grouped[c.corretor].cancelados += 1;
    });
    return json(res, 200, Object.values(grouped).sort((a, b) => b.aprovados - a.aprovados || b.total - a.total));
  }

  if (pathname === '/api/dashboard' && req.method === 'GET') {
    const t = today();
    const indicadores = {
      totalContratos: db.contracts.length,
      emAnalise: db.contracts.filter((c) => c.status === 'em análise').length,
      pendenciasAbertas: db.pendencias.filter((p) => p.status !== 'resolvido').length,
      aprovados: db.contracts.filter((c) => c.status === 'aprovado').length,
      tarefasDoDia: db.tasks.filter((task) => task.data === t).length
    };
    const countBy = (arr, field) => Object.entries(arr.reduce((acc, item) => { acc[item[field]] = (acc[item[field]] || 0) + 1; return acc; }, {}))
      .map(([key, quantidade]) => ({ [field]: key, quantidade }));
    return json(res, 200, {
      indicadores,
      graficos: {
        contractsStatus: countBy(db.contracts, 'status'),
        pendenciasPorPrioridade: countBy(db.pendencias.filter((p) => p.status !== 'resolvido'), 'prioridade')
      }
    });
  }

  const toCsv = (rows, headers) => [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');

  if (pathname === '/api/export/contracts' && req.method === 'GET') {
    const headers = ['nome_cliente', 'corretor', 'operadora', 'tipo_plano', 'data_envio', 'status', 'observacoes'];
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="contratos.csv"' });
    return res.end(toCsv(db.contracts, headers));
  }

  if (pathname === '/api/export/pendencias' && req.method === 'GET') {
    const headers = ['cliente', 'corretor', 'tipo_pendencia', 'descricao', 'prioridade', 'prazo', 'status'];
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="pendencias.csv"' });
    return res.end(toCsv(db.pendencias, headers));
  }

  if (!pathname.startsWith('/api/')) return serveFile(req, res, pathname);
  json(res, 404, { message: 'Rota não encontrada' });
});

server.listen(PORT, () => {
  console.log(`Painel do Supervisor rodando em http://localhost:${PORT}`);
});
