/**
 * Tipos gerados automaticamente do schema do Supabase
 * Projeto: yycqshcmbzrbnsikeoun (prever-br)
 * Gerado em: 2025-12-11
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LedgerCategory = 'DEPOSIT' | 'WITHDRAW' | 'TRADE' | 'PAYOUT'

export type MarketCategory =
  | 'politica'
  | 'economia'
  | 'esportes'
  | 'entretenimento'
  | 'tecnologia'
  | 'internacional'
  | 'outros'
  | 'macroeconomia'
  | 'politica_fiscal'
  | 'politica_monetaria'
  | 'cripto'
  | 'geopolitica'

export type OrderSide = 'buy' | 'sell'
export type OrderType = 'limit' | 'market'
export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled'
export type MarketStatus = 'open' | 'won' | 'lost'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      markets: {
        Row: {
          id: string
          title: string
          description: string | null
          image_url: string | null
          category: MarketCategory
          ends_at: string
          outcome: boolean | null
          pool_yes: number
          pool_no: number
          created_by: string | null
          created_at: string | null
          resolved_at: string | null
          initial_k: number | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          image_url?: string | null
          category?: MarketCategory
          ends_at: string
          outcome?: boolean | null
          pool_yes?: number
          pool_no?: number
          created_by?: string | null
          created_at?: string | null
          resolved_at?: string | null
          initial_k?: number | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          category?: MarketCategory
          ends_at?: string
          outcome?: boolean | null
          pool_yes?: number
          pool_no?: number
          created_by?: string | null
          created_at?: string | null
          resolved_at?: string | null
          initial_k?: number | null
        }
      }
      ledger_entries: {
        Row: {
          id: string
          user_id: string
          amount: number
          category: LedgerCategory
          reference_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          category: LedgerCategory
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: never // Ledger é imutável
      }
      market_positions: {
        Row: {
          id: string
          user_id: string
          market_id: string
          shares_yes: number
          shares_no: number
          avg_cost_yes: number | null
          avg_cost_no: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          market_id: string
          shares_yes?: number
          shares_no?: number
          avg_cost_yes?: number | null
          avg_cost_no?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          market_id?: string
          shares_yes?: number
          shares_no?: number
          avg_cost_yes?: number | null
          avg_cost_no?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: never // Audit logs são imutáveis
      }
      odds_history: {
        Row: {
          id: string
          market_id: string
          odds_yes: number
          odds_no: number
          pool_yes: number
          pool_no: number
          recorded_at: string
        }
        Insert: {
          id?: string
          market_id: string
          odds_yes: number
          odds_no: number
          pool_yes: number
          pool_no: number
          recorded_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          odds_yes?: number
          odds_no?: number
          pool_yes?: number
          pool_no?: number
          recorded_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          market_id: string
          user_id: string
          outcome: boolean
          side: OrderSide
          order_type: OrderType
          price: number | null
          quantity: number
          filled_quantity: number
          avg_fill_price: number | null
          status: OrderStatus
          is_platform_order: boolean
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          market_id: string
          user_id: string
          outcome: boolean
          side: OrderSide
          order_type?: OrderType
          price?: number | null
          quantity: number
          filled_quantity?: number
          avg_fill_price?: number | null
          status?: OrderStatus
          is_platform_order?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          user_id?: string
          outcome?: boolean
          side?: OrderSide
          order_type?: OrderType
          price?: number | null
          quantity?: number
          filled_quantity?: number
          avg_fill_price?: number | null
          status?: OrderStatus
          is_platform_order?: boolean
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_fills: {
        Row: {
          id: string
          market_id: string
          buy_order_id: string
          sell_order_id: string
          buyer_id: string
          seller_id: string
          outcome: boolean
          price: number
          quantity: number
          buyer_fee: number
          seller_fee: number
          created_at: string
        }
        Insert: {
          id?: string
          market_id: string
          buy_order_id: string
          sell_order_id: string
          buyer_id: string
          seller_id: string
          outcome: boolean
          price: number
          quantity: number
          buyer_fee?: number
          seller_fee?: number
          created_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          buy_order_id?: string
          sell_order_id?: string
          buyer_id?: string
          seller_id?: string
          outcome?: boolean
          price?: number
          quantity?: number
          buyer_fee?: number
          seller_fee?: number
          created_at?: string
        }
      }
      user_shares: {
        Row: {
          id: string
          market_id: string
          user_id: string
          outcome: boolean
          quantity: number
          avg_cost: number | null
          realized_pnl: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          market_id: string
          user_id: string
          outcome: boolean
          quantity?: number
          avg_cost?: number | null
          realized_pnl?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          market_id?: string
          user_id?: string
          outcome?: boolean
          quantity?: number
          avg_cost?: number | null
          realized_pnl?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      // ============================================
      // RPC Functions - Tipadas para eliminar "as any"
      // ============================================

      get_user_balance: {
        Args: { p_user_id: string }
        Returns: number
      }

      get_market_odds: {
        Args: { p_market_id: string }
        Returns: {
          price_yes: number
          price_no: number
          total_liquidity: number
        }[]
      }

      get_best_prices: {
        Args: { p_market_id: string; p_outcome: boolean }
        Returns: {
          best_bid: number | null
          best_ask: number | null
          bid_quantity: number | null
          ask_quantity: number | null
        }[]
      }

      get_order_book: {
        Args: { p_market_id: string }
        Returns: {
          outcome: boolean
          side: string
          price: number
          total_quantity: number
          order_count: number
        }[]
      }

      get_order_book_detailed: {
        Args: { p_market_id: string; p_outcome: boolean; p_depth?: number }
        Returns: {
          side: string
          price: number
          quantity: number
          cumulative_quantity: number
          order_count: number
        }[]
      }

      get_user_open_orders: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          market_id: string
          market_title: string
          outcome: boolean
          side: string
          order_type: string
          price: number
          quantity: number
          filled_quantity: number
          status: string
          created_at: string
        }[]
      }

      get_user_positions: {
        Args: { p_user_id: string }
        Returns: {
          market_id: string
          market_title: string
          market_status: string
          outcome: boolean
          quantity: number
          avg_cost: number | null
          current_value: number
          unrealized_pnl: number
        }[]
      }

      get_user_trade_history: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          id: string
          market_id: string
          market_title: string
          outcome: boolean
          side: string
          price: number
          quantity: number
          total: number
          created_at: string
        }[]
      }

      place_order: {
        Args: {
          p_user_id: string
          p_market_id: string
          p_outcome: boolean
          p_side: string
          p_order_type: string
          p_price: number | null
          p_quantity: number
        }
        Returns: Json
      }

      cancel_order: {
        Args: { p_user_id: string; p_order_id: string }
        Returns: Json
      }

      rpc_deposit_mock: {
        Args: { p_user_id: string; p_amount: number }
        Returns: Json
      }

      rpc_create_market: {
        Args: {
          p_title: string
          p_description: string
          p_ends_at: string
          p_initial_liquidity?: number
          p_image_url?: string | null
          p_category?: MarketCategory
        }
        Returns: Json
      }

      rpc_resolve_market: {
        Args: { p_market_id: string; p_winning_outcome: boolean }
        Returns: Json
      }

      rpc_buy_shares: {
        Args: { p_market_id: string; p_outcome: boolean; p_amount: number }
        Returns: Json
      }

      rpc_sell_shares: {
        Args: { p_market_id: string; p_outcome: boolean; p_shares: number }
        Returns: Json
      }

      create_platform_orders: {
        Args: {
          p_market_id: string
          p_yes_bid_price: number
          p_yes_ask_price: number
          p_quantity: number
          p_platform_user_id: string
        }
        Returns: Json
      }

      get_admin_payment_report: {
        Args: { p_market_id?: string | null }
        Returns: Json
      }

      record_odds_snapshot: {
        Args: { p_market_id: string }
        Returns: void
      }
    }
  }
}

// ============================================
// Helper Types
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Functions = Database['public']['Functions']

// ============================================
// Table Row Types (shortcuts)
// ============================================

export type Profile = Tables<'profiles'>
export type Market = Tables<'markets'>
export type LedgerEntry = Tables<'ledger_entries'>
export type MarketPosition = Tables<'market_positions'>
export type AuditLog = Tables<'audit_logs'>
export type OddsHistory = Tables<'odds_history'>
export type Order = Tables<'orders'>
export type OrderFill = Tables<'order_fills'>
export type UserShare = Tables<'user_shares'>

// ============================================
// RPC Response Types
// ============================================

export interface PlaceOrderResponse {
  success: boolean
  error?: string
  order_id?: string
  filled_quantity?: number
  remaining_quantity?: number
  avg_price?: number
  total_cost?: number
  status?: OrderStatus
}

export interface CancelOrderResponse {
  success: boolean
  error?: string
  order_id?: string
  filled_quantity?: number
  cancelled_quantity?: number
}

export interface DepositResponse {
  success: boolean
  amount: number
  new_balance: number
}

export interface CreateMarketResponse {
  success: boolean
  error?: string
  market_id?: string
}

export interface ResolveMarketResponse {
  success: boolean
  winning_outcome: boolean
  total_payout: number
  winners_count: number
  cancelled_orders: number
}

export interface BuySharesResponse {
  success: boolean
  shares: number
  outcome: boolean
  amount_spent: number
  new_balance: number
  price_before: number
  price_after: number
}

export interface SellSharesResponse {
  success: boolean
  shares_sold: number
  amount_received: number
  new_balance: number
  price_before: number
  price_after: number
}

// ============================================
// Extended Types (with computed fields)
// ============================================

export interface MarketWithOdds extends Market {
  odds_yes: number
  odds_no: number
  total_liquidity: number
}

export interface UserPosition {
  market_id: string
  market_title: string
  market_status: MarketStatus
  outcome: boolean
  quantity: number
  avg_cost: number | null
  current_value: number
  unrealized_pnl: number
}

export interface UserOpenOrder {
  id: string
  market_id: string
  market_title: string
  outcome: boolean
  side: OrderSide
  order_type: OrderType
  price: number
  quantity: number
  filled_quantity: number
  status: OrderStatus
  created_at: string
}

export interface TradeHistoryItem {
  id: string
  market_id: string
  market_title: string
  outcome: boolean
  side: OrderSide
  price: number
  quantity: number
  total: number
  created_at: string
}

export interface BestPrices {
  best_bid: number | null
  best_ask: number | null
  bid_quantity: number | null
  ask_quantity: number | null
}

export interface OrderBookLevel {
  side: OrderSide
  price: number
  quantity: number
  cumulative_quantity: number
  order_count: number
}
