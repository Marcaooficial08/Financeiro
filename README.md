# Financeiro

Aplicação web multiusuário para gestão de finanças pessoais em pt-BR. Permite cadastrar contas (corrente, poupança, dinheiro, cartão de crédito, investimento e tickets corporativos — refeição, combustível e premiação), categorias, transações de receita/despesa, e gera dashboard, relatórios e exportação CSV. A interface, mensagens e moeda padrão (BRL) são todas brasileiras.

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts disponíveis](#scripts-disponíveis)
- [Arquitetura](#arquitetura)
  - [Estrutura de diretórios](#estrutura-de-diretórios)
  - [Roteamento e fronteira de autenticação](#roteamento-e-fronteira-de-autenticação)
  - [Modelo de autenticação](#modelo-de-autenticação)
  - [Padrão Server Actions](#padrão-server-actions)
  - [Dinheiro: invariante saldo ↔ transação](#dinheiro-invariante-saldo--transação)
  - [Tipos de conta e categorias de sistema](#tipos-de-conta-e-categorias-de-sistema)
  - [Notificações e i18n](#notificações-e-i18n)
  - [Relatórios](#relatórios)
- [Modelo de dados](#modelo-de-dados)
- [Endpoints da API](#endpoints-da-api)
- [Testes](#testes)
- [Deploy](#deploy)
- [Solução de problemas](#solução-de-problemas)
- [Notas de segurança](#notas-de-segurança)

## Funcionalidades

- Autenticação com email/senha (NextAuth + JWT, sessão de 30 dias) com bcrypt para hashing.
- Fluxo completo de redefinição de senha por token (`/api/auth/forgot-password` → email → `/reset-password/[token]`).
- Rate limiting in-memory para `login`, `register` e `forgot-password`.
- CRUD de **contas**, **categorias** e **transações**, todos escopados por `userId`.
- Tipos de conta especiais para benefícios corporativos (Ticket Refeição, Ticket Combustível, Ticket Premiação) com regras de roteamento de categoria → conta.
- Categorias de sistema pré-semeadas no registro (Salário, Combustível, Uber, Ticket Refeição, Ticket Premiação, etc.).
- Regra especial Uber: independente do tipo da transação, a movimentação **sempre debita** o saldo.
- Saldo da conta (`Account.balance`) atualizado atomicamente junto com `Transaction` via `prisma.$transaction`.
- Bloqueio de overdraft em despesas (`EXPENSE`).
- Dashboard com gráficos (Recharts) e filtros.
- Relatórios agregados por categoria/mês com exportação para CSV.
- Painel `/admin` (somente role `ADMIN`) com gestão de usuários e auditoria.
- Tema claro/escuro com persistência via `localStorage` + script no `<head>` para evitar flash.

## Stack

| Camada              | Tecnologia                                                           |
| ------------------- | -------------------------------------------------------------------- |
| Framework           | Next.js 16 (App Router) · React 19 · TypeScript 6                    |
| Banco de dados      | PostgreSQL (recomendado: Neon serverless)                            |
| ORM                 | Prisma 7 com `@prisma/adapter-pg` (driver adapter node-postgres)     |
| Autenticação        | NextAuth 4 (provider `credentials`, estratégia JWT) + bcryptjs       |
| Validação           | Zod 4 + react-hook-form (`@hookform/resolvers`)                      |
| Estilização         | Tailwind CSS 4 (`@tailwindcss/postcss`) · `react-icons`              |
| Gráficos            | Recharts 3                                                           |
| Datas               | `date-fns` 4                                                         |
| Lint                | ESLint 9 + `eslint-config-next`                                      |

## Pré-requisitos

- **Node.js 20+** (Next.js 16 e React 19 requerem versões recentes).
- **npm** (o repositório versiona `package-lock.json`; use `npm` para manter consistência).
- **PostgreSQL 14+**, local ou hospedado. O time atual usa **Neon** com `sslmode=require`.
- **Git**.

## Como rodar localmente

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd Financeiro
```

### 2. Instalar dependências

```bash
npm install
```

Isto baixa as dependências e dispara o `postinstall` do Prisma (`prisma generate`).

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz com o seguinte conteúdo (substitua pelos seus valores):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_SECRET="<gerar com: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DOMAIN="localhost"
```

Gerar um `NEXTAUTH_SECRET` seguro:

```bash
# Linux / macOS / Git Bash
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

> Detalhes de cada variável estão em [Variáveis de ambiente](#variáveis-de-ambiente).

### 4. Subir o banco e aplicar migrações

Para um Postgres local com Docker:

```bash
docker run --name financeiro-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=financeiro \
  -p 5432:5432 \
  -d postgres:16
```

Em seguida, com o `DATABASE_URL` apontando para essa instância (ou para o Neon), aplique as migrações:

```bash
npx prisma migrate deploy   # aplica todas as migrações existentes
npx prisma generate          # gera o cliente do Prisma
```

Para criar uma nova migração durante desenvolvimento:

```bash
npx prisma migrate dev --name <nome-da-migracao>
```

Para inspecionar o banco visualmente:

```bash
npx prisma studio
```

### 5. Semear categorias padrão (opcional)

Categorias de sistema já são criadas automaticamente no `register`. Para popular usuários **existentes** com as categorias defaults (Salário, Combustível, Uber, Ticket Refeição/Premiação):

```bash
node scripts/seed-default-categories.mjs
```

### 6. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A página raiz redireciona para `/dashboard` se houver sessão, caso contrário para `/sign-in`.

### 7. Criar um usuário

Use a página `/sign-up` ou faça `POST /api/auth/register` com `{ email, name, password }`. O registro:

- Cria o `User` com senha em hash (bcrypt, 10 rounds).
- Roda `ensureDefaultCategories` na mesma transação para semear as categorias de sistema.

Para promover um usuário a `ADMIN`, atualize o registro direto no banco (não há UI pública para isso):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'voce@exemplo.com';
```

## Variáveis de ambiente

### Obrigatórias

| Variável           | Descrição                                                                               | Como obter                                       |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`     | String de conexão PostgreSQL. `lib/prisma.ts` lança erro se ausente.                    | Provedor (Neon, Supabase, Postgres local).       |
| `NEXTAUTH_SECRET`  | Segredo para assinar/criptografar JWT do NextAuth.                                      | `openssl rand -base64 32`.                       |
| `NEXTAUTH_URL`     | URL base para callbacks do NextAuth.                                                    | `http://localhost:3000` em dev; URL pública em prod. |

### Opcionais / públicas

| Variável              | Descrição                                                | Default               |
| --------------------- | -------------------------------------------------------- | --------------------- |
| `NEXT_PUBLIC_APP_URL` | URL pública usada por links e templates de email.        | -                     |
| `NEXT_PUBLIC_DOMAIN`  | Domínio para cookies / configurações de UI.              | -                     |

> O `prisma.config.ts` carrega `.env` via `dotenv/config`, então o CLI do Prisma (`migrate`, `studio`, `generate`) também enxerga o `DATABASE_URL` do arquivo.

## Scripts disponíveis

| Comando                       | O que faz                                                    |
| ----------------------------- | ------------------------------------------------------------ |
| `npm run dev`                 | Inicia o servidor Next.js em modo desenvolvimento.           |
| `npm run build`               | Build de produção (`next build`).                            |
| `npm run start`               | Sobe o servidor de produção (após `npm run build`).          |
| `npm run lint`                | ESLint 9 com `eslint-config-next`.                           |
| `npx prisma generate`         | Regenera o Prisma Client após editar `schema.prisma`.        |
| `npx prisma migrate dev`      | Cria/aplica migração local e regenera o client.              |
| `npx prisma migrate deploy`   | Aplica migrações pendentes (uso em CI/produção).             |
| `npx prisma studio`           | UI gráfica para inspecionar/editar dados.                    |
| `node scripts/seed-default-categories.mjs` | Semeia categorias padrão para todos os usuários existentes. |

## Arquitetura

### Estrutura de diretórios

```
.
├── app/                              # Next.js App Router
│   ├── (protected)/                  # Rotas que exigem sessão
│   │   ├── layout.tsx                # Carrega session + Sidebar
│   │   ├── sidebar.tsx               # Navegação lateral fixa
│   │   ├── dashboard/                # KPIs e gráficos (Recharts)
│   │   ├── accounts/                 # CRUD de contas
│   │   ├── categories/               # CRUD de categorias
│   │   ├── transactions/             # CRUD de transações
│   │   ├── reports/                  # Visualização de relatórios
│   │   └── admin/                    # Apenas role=ADMIN
│   ├── (public)/                     # Rotas públicas (vazio hoje)
│   ├── _components/                  # Componentes compartilhados
│   ├── _providers/                   # Providers (tema, etc.)
│   ├── api/                          # Route handlers
│   │   ├── auth/                     #  ├ NextAuth + register/forgot/reset
│   │   ├── accounts/                 #  ├ Endpoints de conta
│   │   ├── categories/               #  ├ Endpoints de categoria
│   │   └── reports/                  #  └ Relatórios + CSV
│   ├── sign-in/                      # Login (público)
│   ├── sign-up/                      # Cadastro (público)
│   ├── reset-password/[token]/       # Redefinição de senha (público)
│   ├── layout.tsx                    # Root layout (tema inicial)
│   ├── providers.tsx                 # Wrapper do SessionProvider
│   ├── page.tsx                      # Redireciona para /dashboard ou /sign-in
│   └── globals.css                   # Tailwind base
├── components/
│   └── DatePicker.tsx                # Date picker compartilhado
├── lib/                              # Lógica reutilizável
│   ├── auth.ts                       # authOptions (NextAuth)
│   ├── prisma.ts                     # PrismaClient singleton + adapter pg
│   ├── transactions.ts               # getTransactionEffect (sinal +/-)
│   ├── defaults.ts                   # Categorias de sistema + regras
│   ├── dashboard.ts                  # Agregações para o dashboard
│   ├── reports.ts                    # generateReport + exportReportCSV
│   ├── notifications.ts              # Catálogo de mensagens (pt-BR)
│   ├── rate-limiter.ts               # Rate limit in-memory
│   ├── token.ts                      # Geração/validação de reset tokens
│   ├── email.ts                      # Envio de emails de redefinição
│   └── date.ts                       # Helpers de data (calendar/ISO/BR)
├── prisma/
│   ├── schema.prisma                 # Modelos
│   └── migrations/                   # Histórico de migrações
├── scripts/
│   └── seed-default-categories.mjs   # Seed manual de categorias
├── types/
│   └── next-auth.d.ts                # Augmentation: id + role na sessão
├── public/                           # Assets estáticos
├── middleware.ts                     # Gate de auth + admin
├── prisma.config.ts                  # Config do CLI do Prisma
├── tsconfig.json                     # alias `@/*` → raiz
├── tailwind.config.js                # Conteúdo: app/, components/
├── postcss.config.js                 # @tailwindcss/postcss
└── package.json
```

> Pastas com `_` no início (`_actions/`, `_components/`, `_lib/`, `_providers/`) são ignoradas pelo roteador do App Router — usadas para agrupar arquivos colocados.

### Roteamento e fronteira de autenticação

A fronteira pública/protegida é codificada com route groups:

- `app/(protected)/**` — exige sessão. O `layout.tsx` chama `getServerSession(authOptions)` e envolve as páginas com a `Sidebar`. Subrotas em `/admin` exigem `session.user.role === "ADMIN"`.
- `app/sign-in`, `app/sign-up`, `app/reset-password/**` — páginas públicas.
- `app/api/auth/**` — handlers do NextAuth + endpoints custom (`register`, `forgot-password`, `reset-password/[token]`).

`middleware.ts` aplica o gate via `withAuth` do NextAuth:

```ts
matcher: [
  "/((?!api/auth|_next/static|_next/image|favicon.ico|sign-in|sign-up|reset-password).*)",
];
```

Tudo que não estiver excluído pelo matcher exige token. A regra de admin (redireciona para `/dashboard` quando `token.role !== "ADMIN"`) também vive no middleware, não só no layout.

### Modelo de autenticação

`lib/auth.ts` define um único provider `credentials` que usa `bcrypt.compare` contra `User.password`. A estratégia de sessão é JWT (30 dias). Os callbacks copiam `id` e `role` para o token e a sessão; `types/next-auth.d.ts` aumenta os tipos do NextAuth para que `session.user.id` e `session.user.role` sejam tipados.

> **Ao adicionar novos campos** que precisem chegar ao client, atualize **três** lugares: callback `jwt`, callback `session` e `types/next-auth.d.ts`.

### Padrão Server Actions

Toda feature em `app/(protected)/<feature>/` segue a mesma forma: um `page.tsx` (server component) e um `actions.ts` marcado `"use server"`. O fluxo canônico é:

1. `getServerSession(authOptions)` → extrai `userId`; aborta com `{ success: false, error }` se não houver.
2. Parse do `FormData` por um schema Zod declarado no topo do arquivo.
3. Toda query do Prisma escopada por `userId` (incluindo `findFirst` antes de `delete`/`update` — nunca confiar só no id).
4. Mutação seguida de `revalidatePath("/<feature>")`.
5. Retorno `{ success, data?, message?, error? }`. Em `ZodError`, `error.issues[].message` são unidos.

Ações de admin usam `requireAdmin()` (em `app/(protected)/admin/actions.ts`), que lança erro se o role da sessão não for `ADMIN` — backstop server-side ao gate do middleware.

### Dinheiro: invariante saldo ↔ transação

`Account.balance` é um `Decimal(15,2)` mantido em cache na linha da conta. Ele é sincronizado com as linhas de `Transaction` **manualmente** (sem trigger ou view). As regras:

- `lib/transactions.ts` exporta `getTransactionEffect(type, amount)` → `+amount` para `INCOME`, `-amount` para `EXPENSE`. **Use isto em vez de inlinar o ternário.**
- Toda mutação de saldo deve acontecer dentro de `prisma.$transaction` junto com o insert/delete da `Transaction`. Veja `app/(protected)/transactions/actions.ts`:
  - `createTransaction` faz `account.update({ balance: { increment: effect } })` na mesma tx.
  - `deleteTransaction` reverte com `decrement`.
  - Updates de transação devem reverter o efeito antigo e aplicar o novo atomicamente.
- `Transaction.amount` é sempre armazenado **positivo**; o sinal vive em `type`.
- Despesas (`EXPENSE`) são bloqueadas se excederem o saldo atual (`Number(account.balance)`).
- Prisma retorna `Decimal`; coerce com `Number(x)` na fronteira para fazer aritmética em JS.

#### Regra especial: Uber

`lib/defaults.ts` declara as `systemKey`s `UBER_EXPENSE` e `UBER_INCOME` como “sempre debita”. A função `getTransactionEffectForCategory(type, amount, categorySystemKey)` força `-Math.abs(amount)` quando a categoria está nesse conjunto, mesmo que o tipo seja `INCOME`. Use essa variante em fluxos onde a categoria pode ser Uber.

### Tipos de conta e categorias de sistema

`AccountType` inclui tipos comuns (`CHECKING`, `SAVINGS`, `CASH`, `CREDIT_CARD`, `INVESTMENT`, `OTHER`) e três tipos especiais para benefícios:

- `TICKET_MEAL` (refeição)
- `TICKET_FUEL` (combustível)
- `TICKET_AWARD` (premiação)

Categorias de sistema (criadas no registro do usuário) ficam em `lib/defaults.ts` como `DEFAULT_CATEGORIES`. Cada uma tem um `systemKey` estável (`TICKET_MEAL`, `FUEL_INCOME`, `SALARY`, etc.). O mapa `CATEGORY_ACCOUNT_TYPE` define o tipo de conta exigido para cada `systemKey`:

| `systemKey`                              | Tipo de conta exigido |
| ---------------------------------------- | --------------------- |
| `TICKET_MEAL`, `TICKET_MEAL_INCOME`      | `TICKET_MEAL`         |
| `FUEL_EXPENSE`, `FUEL_INCOME`, `UBER_*`  | `TICKET_FUEL`         |
| `TICKET_AWARD`, `TICKET_AWARD_INCOME`    | `TICKET_AWARD`        |
| (sem `systemKey`, definidas pelo usuário) | Conta regular         |

`createTransaction` valida esse roteamento: tentar lançar uma transação numa conta de tipo errado para a categoria escolhida é rejeitado.

### Notificações e i18n

`lib/notifications.ts` centraliza strings de UI em pt-BR sob `messages.success|error|warning|info.*`. Server actions retornam **chaves** de `messages.error.*` no campo `error`. **Não hard-code strings** — adicione em `messages` antes para manter o catálogo completo.

### Relatórios

`lib/reports.ts` expõe:

- `generateReport(userId, start?, end?)` — roda três queries em `Promise.all` (totais via `groupBy`, breakdown por categoria, breakdown mensal) e compõe um `ReportData`. Há também `PlainReportData`, 100% serializável, para atravessar a fronteira RSC.
- `exportReportCSV(report)` — serializa para CSV.

A página `/reports` consome `generateReport`. A rota `/api/reports`:

- `GET ?start=&end=` → JSON do relatório.
- `POST { start, end }` → arquivo CSV (`Content-Disposition: attachment`).
- Existe também `/api/reports/[year]/` (Route Group reservado).

#### Rate limiter

`lib/rate-limiter.ts` é in-memory (um `Map` chaveado por `ip:path`). Configurações ficam no topo do arquivo:

| Endpoint                       | Janela    | Máx. tentativas |
| ------------------------------ | --------- | --------------- |
| `/api/auth/login`              | 15 min    | 5               |
| `/api/auth/register`           | 60 min    | 3               |
| `/api/auth/forgot-password`    | 15 min    | 3               |

Para aplicar: envolva o handler com `withRateLimit('/api/auth/xxx')(handler)`.

> **Importante:** o estado in-memory zera a cada restart do servidor e **não funciona em múltiplas instâncias**. Migre para Redis/DB antes de escalar horizontalmente.

## Modelo de dados

Definido em `prisma/schema.prisma`. Relação resumida:

```
User (id, email, name, role, password*)
 ├─< Account       (userId, name, type, balance, currency, isActive)
 │    └─< Transaction
 ├─< Category      (userId, name, type, systemKey, icon, color, isActive)
 │    └─< Transaction
 ├─< Transaction   (userId, accountId, categoryId, amount, type, date)
 ├─< MonthlySummary (userId, year, month, totalIncome, totalExpense, netBalance, savingsRate)
 ├─< AuditLog      (userId?, action, entityType, entityId, changesJson, ipAddress)
 └─── ResetToken   (userId, token, expiresAt, used)        ← 1:1
```

Pontos-chave:

- **Cascade**: deletar `User` cascateia para `Account`, `Category`, `Transaction`, `MonthlySummary`, `ResetToken`. `AuditLog` usa `SetNull` para preservar histórico.
- **Unicidades por usuário**: `Account @@unique([userId, name])`, `Category @@unique([userId, name, type])` e `@@unique([userId, systemKey])`.
- **Validação cruzada**: `Category.type` precisa bater com `Transaction.type` ao linkar; `createTransaction` checa explicitamente.
- **MonthlySummary** existe no schema mas **não há código que escreva nele hoje** — placeholder para futura agregação.

### Migrações

Cada migração vive em `prisma/migrations/<timestamp>_<nome>/migration.sql`. Histórico atual:

| Migração                                | Conteúdo                                          |
| --------------------------------------- | ------------------------------------------------- |
| `20260418180652_init_database`          | Esquema inicial.                                  |
| `20260422000000_add_ticket_account_type` | Adiciona `TICKET_MEAL` em `AccountType`.          |
| `20260422010000_add_category_system_key` | Adiciona `Category.systemKey`.                    |
| `20260423000000_split_ticket_account_types` | Separa `TICKET_FUEL` de `TICKET_MEAL`.            |
| `20260423120000_add_ticket_award_account_type` | Adiciona `TICKET_AWARD`.                          |
| `20260423225014_card_premiacao`         | Ajustes em categorias de premiação.               |

## Endpoints da API

Apenas rotas custom — handlers do NextAuth ficam em `/api/auth/[...nextauth]`.

| Método | Rota                                  | Descrição                                                              | Auth     | Rate limit |
| ------ | ------------------------------------- | ---------------------------------------------------------------------- | -------- | ---------- |
| POST   | `/api/auth/register`                  | Cria usuário, hash bcrypt, semeia categorias padrão na mesma `$transaction`. | Pública  | ✅ 3/h     |
| POST   | `/api/auth/forgot-password`           | Gera reset token, envia email.                                         | Pública  | ✅ 3/15min |
| POST   | `/api/auth/reset-password/[token]`    | Valida token e troca a senha.                                          | Pública  | -          |
| GET    | `/api/reports?start=&end=`            | Relatório agregado em JSON.                                            | Sessão   | -          |
| POST   | `/api/reports`                        | Mesma agregação, retornada como CSV (download).                        | Sessão   | -          |
| GET    | `/api/accounts`                       | Lista contas do usuário autenticado.                                   | Sessão   | -          |
| GET    | `/api/categories`                     | Lista categorias do usuário autenticado.                               | Sessão   | -          |

A maior parte das mutações **não passa pela API REST** — elas usam Server Actions (ver [Padrão Server Actions](#padrão-server-actions)).

## Testes

Não há test runner JS/TS configurado.

Os smoke tests E2E são scripts **Python + Playwright** na raiz, marcados como descartáveis pelo `.gitignore` (`test_auth_flow*.py`, `test_initial_balance.py`):

```bash
# Pré-requisito: dev server rodando em http://localhost:3000
npm run dev

# Em outro terminal, com Python e Playwright instalados:
pip install playwright
python -m playwright install chromium
python test_initial_balance.py
```

Esses scripts são auxiliares; trate-os como playgrounds, não como suíte oficial.

## Deploy

A aplicação é uma app Next.js padrão. Não há `Dockerfile`, `vercel.json` ou config de deploy específica versionada — escolha o alvo conforme sua infra.

### Vercel (mais simples)

1. Conecte o repositório.
2. Em **Project → Settings → Environment Variables**, configure `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (URL pública), e os `NEXT_PUBLIC_*`.
3. Build command: `next build` (default). Install command: `npm install`.
4. Em **Build & Deploy → Build Hooks/Override**, garanta que `npx prisma migrate deploy` rode antes do build (ou via post-install). Uma forma comum:

   ```json
   // package.json
   "scripts": {
     "build": "prisma migrate deploy && prisma generate && next build"
   }
   ```

5. Use Postgres serverless (Neon/Supabase). O adapter `@prisma/adapter-pg` é compatível.

### Docker (genérico)

Sem `Dockerfile` versionado, um esqueleto razoável:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

Build e run:

```bash
docker build -t financeiro .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e NEXTAUTH_SECRET=... \
  -e NEXTAUTH_URL=https://app.exemplo.com \
  financeiro
```

### Servidor próprio / VPS

```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
npm run start    # ou via pm2/systemd com NODE_ENV=production
```

## Solução de problemas

### `Missing DATABASE_URL environment variable`

Lançado por `lib/prisma.ts`. Verifique se o `.env` existe na raiz e contém `DATABASE_URL`. O CLI do Prisma também lê esse arquivo via `prisma.config.ts` + `dotenv/config`.

### `Migrations are pending` ou tabelas faltando

Aplique as migrações:

```bash
npx prisma migrate deploy
npx prisma generate
```

### Conexão recusada no Postgres / SSL

- Em Neon: `DATABASE_URL` deve incluir `sslmode=require&channel_binding=require`.
- Em Postgres local sem SSL: remova esses parâmetros.

### Erros “Categoria incompatível com o tipo da conta”

A `systemKey` da categoria exige um `AccountType` específico (ver tabela em [Tipos de conta e categorias de sistema](#tipos-de-conta-e-categorias-de-sistema)). Crie ou selecione uma conta do tipo correto, ou use uma categoria sem `systemKey` (definida pelo usuário) em conta regular.

### Sessão sumiu sem motivo

`maxAge` é 30 dias. Se você trocou o `NEXTAUTH_SECRET`, todos os JWTs antigos viram inválidos — usuários precisam logar de novo.

### Rate limit “travado” sem tentativas

`lib/rate-limiter.ts` é in-memory. Reinicie o servidor para zerar (em dev). Em produção multi-instância, isto **não funcionará** — migre para Redis.

### Build falha: `Type error in next-auth session`

Confira se `types/next-auth.d.ts` está incluso pelo `tsconfig.json` (`typeRoots` aponta para `./types`). Ao adicionar campos novos à sessão, atualize callbacks `jwt`/`session` em `lib/auth.ts` **e** o `.d.ts` simultaneamente.

### Saldo da conta divergiu das transações

O invariante depende de **toda** mutação rodar dentro de `prisma.$transaction` (ver [Dinheiro: invariante saldo ↔ transação](#dinheiro-invariante-saldo--transação)). Se algum código mutou `Transaction` sem passar pelas Server Actions oficiais, recalcule:

```sql
-- Exemplo de query de auditoria (somente leitura):
SELECT a.id, a.name, a.balance,
       SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END) AS computed
FROM "Account" a
LEFT JOIN "Transaction" t ON t."accountId" = a.id
GROUP BY a.id, a.name, a.balance
HAVING a.balance <> COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END), 0);
```

## Notas de segurança

- O `.env` versiona localmente — está corretamente listado no `.gitignore`. **Nunca** comite `.env`.
- Senhas usam bcrypt com 10 rounds (`bcrypt.hash(password, 10)`).
- Tokens de reset (`ResetToken`) têm `expiresAt` e flag `used`. Sempre cheque ambos antes de aceitar.
- O rate limiter atual é **in-memory** — adequado para single-instance; substitua por Redis antes de escalar.
- Toda query Prisma é escopada por `userId`. **Nunca confie só no `id` do recurso** ao deletar/atualizar — sempre faça `findFirst({ where: { id, userId } })` antes.
- `AuditLog` usa `onDelete: SetNull` em `userId` para preservar trilha mesmo após exclusão de usuário.
