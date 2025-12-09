# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TesePro** (formerly Prever) is a Brazilian prediction market platform where users trade on outcomes of political, economic, and sports events using BRL (Brazilian Real) - no cryptocurrency. The platform uses CPMM (Constant Product Market Maker) mechanics similar to Uniswap but for prediction markets.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript (strict)
- **UI:** Tailwind CSS 4, shadcn/ui, Lucide React icons
- **Backend:** Supabase (PostgreSQL 16, Auth, Realtime, RLS)
- **Charts:** Recharts for odds history visualization
- **Language:** Portuguese (Brazil) - all UI text in pt-BR

## Commands

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build (validates TypeScript & ESLint)
npm run lint     # ESLint check
npm run start    # Production server
```

## Architecture

### Data Flow

```
User Action → React Hook → Supabase RPC → PostgreSQL Stored Procedure
                ↓                              ↓
         Client Preview (cpmm.ts)      Atomic Transaction + Audit Log
                ↓                              ↓
         Optimistic UI Update          Realtime Broadcast → Hook Update
```

### Key Architectural Decisions

1. **Client-side CPMM is preview-only** - `src/lib/utils/cpmm.ts` calculates estimated returns for UI feedback. The actual transaction logic with locking runs in `supabase/migrations/007_create_stored_procedures.sql`.

2. **Realtime subscriptions** - Hooks like `useBalance()` and `useMarkets()` subscribe to Supabase Realtime channels. Balance updates automatically when `ledger_entries` table changes.

3. **Supabase client patterns:**
   - `src/lib/supabase/client.ts` - Browser client (singleton)
   - `src/lib/supabase/server.ts` - Server components client
   - `src/lib/supabase/middleware.ts` - Auth session refresh

### Hooks (src/lib/hooks/)

| Hook | Purpose |
|------|---------|
| `useAuth()` | Auth state, login/logout, user object |
| `useBalance(user)` | Real-time balance from ledger SUM |
| `useMarkets()` | All open markets with real-time updates |
| `useMarket(id)` | Single market details |
| `useTrade()` | `buyShares()`, `sellShares()`, `depositMock()` |
| `useAdmin()` | Admin actions (create/resolve markets) |
| `useOddsHistory(marketId)` | Historical odds for sparkline charts |

### Database Schema

**Tables:**
- `profiles` - Extended auth.users (full_name, avatar_url, is_admin flag)
- `markets` - pool_yes, pool_no, outcome (null=open, true/false=resolved)
- `ledger_entries` - amount (+ for credit, - for debit), category enum
- `market_positions` - shares_yes, shares_no, avg_cost per user/market
- `audit_logs` - Immutable, INSERT-only

**Stored Procedures (RPC):**
- `rpc_buy_shares(p_market_id, p_outcome, p_amount)` - Locks market row, validates, updates pools/positions/ledger atomically
- `rpc_sell_shares(p_market_id, p_outcome, p_shares)` - Reverse CPMM operation
- `rpc_create_market(p_title, p_description, p_ends_at, p_initial_liquidity)` - Admin only
- `rpc_resolve_market(p_market_id, p_winning_outcome)` - Pays winners R$1 per share
- `rpc_deposit_mock(p_user_id, p_amount)` - Dev testing only
- `get_user_balance(p_user_id)` - Returns SUM(amount) from ledger

### CPMM Math (Money Wagered Model)

```
pool_yes = total money wagered on YES
pool_no  = total money wagered on NO

Price_YES = pool_yes / (pool_yes + pool_no)
Price_NO  = pool_no / (pool_yes + pool_no)

Buy YES with $X:
  new_pool_yes = pool_yes + X
  shares_out   = X / price_yes (at average execution price)

Note: Price of YES increases as more money is bet on YES (demand drives price up)
```

## Critical Rules

1. **Never modify financial state client-side** - All money/share changes go through RPC
2. **Race condition prevention** - Stored procedures use `SELECT ... FOR UPDATE`
3. **Balance = SUM(ledger_entries.amount)** - No denormalized balance column
4. **Audit immutability** - `audit_logs` table has no UPDATE/DELETE policies

## UI Conventions

- **YES:** Emerald green (`text-emerald-500`, `bg-emerald-500`)
- **NO:** Rose red (`text-rose-500`, `bg-rose-500`)
- **Currency:** `R$ 1.000,00` format (use `formatBRL()` from `src/lib/utils/format.ts`)
- **Percentages:** No decimals (`54%` not `54.2%`)
- **Theme:** Dark mode default, institutional styling

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Market Categories

`politica`, `economia`, `esportes`, `entretenimento`, `tecnologia`, `internacional`, `outros`
