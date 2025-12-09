# TesePro

> **Dados, não apostas. Teses.**

Plataforma brasileira de mercados de previsão onde usuários negociam teses sobre eventos de política, economia e esportes usando BRL (Real) — sem criptomoedas, sem complicação.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

---

## Funcionalidades

### Para Usuários

- **Explorar Teses** — Navegue por mercados de política, economia, esportes, entretenimento e mais
- **Trading Simples** — Compre SIM ou NÃO com preview em tempo real de retorno e ROI
- **Sparklines Reais** — Gráficos de histórico de odds com variação 24h
- **Carteira Digital** — Saldo atualizado em tempo real, histórico de transações
- **Minhas Posições** — Portfolio com P&L (Profit & Loss) calculado automaticamente
- **Busca e Filtros** — Por categoria, "Em Alta", "Encerrando", ou texto livre

### Para Administradores

- **Criar Mercados** — Interface simples para criar novas teses
- **Resolver Mercados** — Definir resultado (SIM/NÃO) com pagamento automático aos vencedores

### Técnico

- **Real-time** — Todas as telas atualizam instantaneamente via Supabase Realtime
- **CPMM Atômico** — Toda lógica financeira roda em PostgreSQL Stored Procedures
- **Ledger Imutável** — Saldo = SUM(transações), nunca coluna denormalizada
- **RLS** — Row Level Security em todas as tabelas

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **UI** | Tailwind CSS 4, shadcn/ui, Lucide Icons |
| **Charts** | Recharts (sparklines de odds) |
| **Backend** | Supabase (PostgreSQL 16, Auth, Realtime) |
| **Market Maker** | CPMM (Constant Product Market Maker) |

---

## Quick Start

```bash
# 1. Clone o repositório
git clone https://github.com/rodrigobatista21/tesepro-prediction-market.git
cd tesepro-prediction-market

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas credenciais do Supabase

# 4. Execute as migrations no Supabase (001 a 008)
# Via Supabase Dashboard > SQL Editor

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Homepage │  │ Mercado  │  │ Carteira │  │  Admin   │        │
│  │  /       │  │ /[id]    │  │ /carteira│  │ /admin   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴──────┬──────┴─────────────┘               │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                    React Hooks                            │  │
│  │  useMarkets() useBalance() useTrade() useAuth() useAdmin()│  │
│  └─────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ Supabase Client
                             │ (REST + Realtime WebSocket)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL 16                          │   │
│  │                                                           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │   │
│  │  │profiles │ │ markets │ │ ledger  │ │market_positions │ │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │              Stored Procedures (RPC)                │ │   │
│  │  │  rpc_buy_shares │ rpc_sell_shares │ rpc_resolve_... │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │    Auth    │  │  Realtime  │  │    RLS     │                 │
│  │ (Google,   │  │ (WebSocket │  │ (Row Level │                 │
│  │  Email)    │  │  Broadcast)│  │  Security) │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Como Funciona o CPMM

O TesePro usa **Constant Product Market Maker** com modelo de "dinheiro apostado" para precificação automática.

### Modelo de Precificação

Diferente do modelo tradicional de AMM (liquidez), usamos um modelo onde:
- **pool_yes** = total de dinheiro apostado em SIM
- **pool_no** = total de dinheiro apostado em NÃO
- O preço reflete a proporção do dinheiro apostado em cada lado

### Cálculo de Preço (Probabilidade)

```
Preço SIM = pool_yes / (pool_yes + pool_no)
Preço NÃO = pool_no / (pool_yes + pool_no)
```

> **Nota:** O preço de SIM aumenta conforme mais dinheiro é apostado em SIM (maior demanda = maior preço).

### Exemplo: Compra de R$ 100 no SIM

```
Estado inicial:
  pool_yes = 1000, pool_no = 1000
  Preço SIM = 1000 / 2000 = 50%

Usuário compra R$ 100 no SIM:
  novo_pool_yes = 1000 + 100 = 1100
  pool_no permanece = 1000

  shares_recebidas = 100 / 0.50 = 200 ações (ao preço médio)

Novo preço:
  Preço SIM = 1100 / 2100 = 52.4%
```

### Pagamento

Quando o mercado resolve:
- Cada ação do lado vencedor vale **R$ 1,00**
- Usuário com 200 ações SIM recebe R$ 200 se SIM ganhar

---

## Database Schema

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Extensão do auth.users (nome, avatar, is_admin) |
| `markets` | Mercados de previsão (pools, outcome, ends_at) |
| `ledger_entries` | Transações financeiras (DEPOSIT, TRADE, PAYOUT) |
| `market_positions` | Posições dos usuários (shares_yes, shares_no) |
| `audit_logs` | Log imutável de todas as ações |

### Stored Procedures

```sql
-- Comprar ações (com lock para evitar race condition)
rpc_buy_shares(p_market_id, p_outcome, p_amount)

-- Vender ações
rpc_sell_shares(p_market_id, p_outcome, p_shares)

-- Criar mercado (admin only)
rpc_create_market(p_title, p_description, p_ends_at, p_initial_liquidity)

-- Resolver mercado e pagar vencedores (admin only)
rpc_resolve_market(p_market_id, p_winning_outcome)

-- Depósito simulado (apenas para dev)
rpc_deposit_mock(p_user_id, p_amount)
```

---

## Categorias

- `politica` — Eleições, leis, governo
- `economia` — Indicadores, mercado financeiro
- `esportes` — Campeonatos, resultados
- `entretenimento` — TV, música, cultura
- `tecnologia` — Lançamentos, tendências
- `internacional` — Eventos globais
- `outros` — Diversos

---

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Verificação ESLint
```

---

## Estrutura de Diretórios

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register
│   ├── (dashboard)/        # Mercado, Carteira, Minhas-apostas
│   ├── admin/              # Painel administrativo
│   └── page.tsx            # Homepage
├── components/
│   ├── markets/            # MarketCard, OddsBar, OddsChart
│   ├── trading/            # TradePanel
│   ├── wallet/             # BalanceDisplay, DepositModal
│   ├── admin/              # CreateMarketForm, AdminMarketList
│   └── ui/                 # shadcn/ui components
└── lib/
    ├── hooks/              # useAuth, useBalance, useMarkets, useTrade
    ├── supabase/           # Client, Server, Middleware
    ├── types/              # TypeScript types
    └── utils/              # format.ts, cpmm.ts

supabase/
└── migrations/             # SQL migrations (001-008)
```

---

## Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Convenções de UI

| Elemento | Estilo |
|----------|--------|
| **SIM** | Verde emerald (`text-emerald-500`) |
| **NÃO** | Vermelho rose (`text-rose-500`) |
| **Moeda** | `R$ 1.234,56` (pt-BR) |
| **Percentual** | `54%` (sem decimais) |
| **Tema** | Dark mode padrão |

---

## Licença

Proprietário - Todos os direitos reservados.

---

<p align="center">
  <strong>TesePro</strong> — Dados, não apostas. Teses.
</p>
