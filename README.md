# Painel do Supervisor

Sistema web para gestão operacional comercial de planos de saúde, com foco em produtividade diária do supervisor.

## Funcionalidades implementadas

- Login simples (usuário/senha local).
- Dashboard principal com indicadores e gráficos.
- Gestão de contratos em andamento:
  - Cadastro de contratos.
  - Filtros por corretor, status e intervalo de datas.
  - Busca por nome do cliente.
  - Exportação CSV.
- Gestão de pendências:
  - Cadastro de pendências.
  - Destaque visual para pendências atrasadas.
  - Exportação CSV.
- Ranking de corretores com resumo por status de contratos.
- Tarefas do dia:
  - Cadastro com prioridade e horário.
  - Marcar como concluída.
  - Destaque das tarefas de hoje no topo.
- Modo claro/escuro.
- Layout responsivo para desktop e celular.

## Stack

- **Backend:** Node.js (HTTP nativo)
- **Banco local:** arquivo JSON (`data/db.json`)
- **Frontend:** HTML/CSS/JavaScript + Chart.js

## Como rodar localmente

1. Inicie o servidor:

```bash
npm run dev
```

2. Acesse no navegador:

```text
http://localhost:3000
```

## Credenciais padrão

- Usuário: `supervisor`
- Senha: `123456`

## Estrutura do projeto

```text
.
├── data/
│   └── db.json            # banco local em JSON (gerado automaticamente)
├── public/                # frontend
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── db.js                  # legado/compatibilidade
├── server.js              # API + servidor web
└── README.md
```

## Fluxo principal para teste

1. Fazer login.
2. Verificar cards e gráficos no dashboard.
3. Cadastrar contrato e aplicar filtros/busca.
4. Cadastrar pendência e validar destaque de atraso.
5. Adicionar tarefa do dia e marcar como concluída.
6. Validar ranking de corretores.
7. Exportar contratos e pendências em CSV.
8. Alternar tema claro/escuro.
9. Testar em resolução mobile.

## Sugestões de melhorias futuras

- Autenticação JWT + hash de senha.
- Perfis de acesso (supervisor, gerente, corretor).
- Edição/exclusão de contratos, pendências e tarefas.
- Auditoria de alterações e histórico de eventos.
- Upload de documentos por contrato.
- Notificações automáticas de prazo (e-mail/WhatsApp).
- Migração para banco SQL (PostgreSQL/SQLite).
- Testes automatizados de API e interface.
- Deploy em nuvem com backup de dados.
