// Tipos do banco de dados Supabase
// Gerar automaticamente com: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.types.ts

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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
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
          created_at: string
          resolved_at: string | null
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
          created_at?: string
          resolved_at?: string | null
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
          created_at?: string
          resolved_at?: string | null
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
          avg_cost_yes: number
          avg_cost_no: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          market_id: string
          shares_yes?: number
          shares_no?: number
          avg_cost_yes?: number
          avg_cost_no?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          market_id?: string
          shares_yes?: number
          shares_no?: number
          avg_cost_yes?: number
          avg_cost_no?: number
          created_at?: string
          updated_at?: string
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
          metadata: Json
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
          metadata?: Json
          created_at?: string
        }
        Update: never // Audit logs são imutáveis
      }
      orders: {
        Row: {
          id: string
          market_id: string
          user_id: string
          outcome: boolean
          side: string
          order_type: string
          price: number | null
          quantity: number
          filled_quantity: number
          avg_fill_price: number | null
          status: string
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
          side: string
          order_type?: string
          price?: number | null
          quantity: number
          filled_quantity?: number
          avg_fill_price?: number | null
          status?: string
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
          side?: string
          order_type?: string
          price?: number | null
          quantity?: number
          filled_quantity?: number
          avg_fill_price?: number | null
          status?: string
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
          user_id: string
          market_id: string
          outcome: boolean
          quantity: number
          avg_cost: number | null
          realized_pnl: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          market_id: string
          outcome: boolean
          quantity?: number
          avg_cost?: number | null
          realized_pnl?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          market_id?: string
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
      rpc_deposit_mock: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: Json
      }
      rpc_create_market: {
        Args: {
          p_title: string
          p_description: string
          p_category?: MarketCategory
          p_ends_at: string
          p_initial_liquidity?: number
          p_image_url?: string | null
        }
        Returns: Json
      }
      rpc_resolve_market: {
        Args: {
          p_market_id: string
          p_winning_outcome: boolean
        }
        Returns: Json
      }
      get_user_balance: {
        Args: {
          p_user_id: string
        }
        Returns: number
      }
      get_market_odds: {
        Args: {
          p_market_id: string
        }
        Returns: {
          price_yes: number
          price_no: number
          total_liquidity: number
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
        Args: {
          p_user_id: string
          p_order_id: string
        }
        Returns: Json
      }
      get_order_book_detailed: {
        Args: {
          p_market_id: string
          p_outcome: boolean
          p_depth?: number
        }
        Returns: {
          side: string
          price: number
          quantity: number
          cumulative_quantity: number
          order_count: number
        }[]
      }
      get_best_prices: {
        Args: {
          p_market_id: string
          p_outcome: boolean
        }
        Returns: {
          best_bid: number | null
          best_ask: number | null
          bid_quantity: number | null
          ask_quantity: number | null
        }[]
      }
      get_user_open_orders: {
        Args: {
          p_user_id: string
        }
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
        Args: {
          p_user_id: string
        }
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
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Tipos específicos
export type Profile = Tables<'profiles'>
export type Market = Tables<'markets'>
export type LedgerEntry = Tables<'ledger_entries'>
export type MarketPosition = Tables<'market_positions'>
export type AuditLog = Tables<'audit_logs'>

// Tipos de resposta das RPCs
export interface DepositResponse {
  success: boolean
  amount: number
  new_balance: number
}

// Order Book response types
export interface PlaceOrderResponse {
  success: boolean
  error?: string
  order_id?: string
  filled_quantity?: number
  remaining_quantity?: number
  avg_price?: number
  total_cost?: number
  status?: 'open' | 'partial' | 'filled' | 'cancelled'
}

// Tipo de mercado com odds calculadas
export interface MarketWithOdds extends Market {
  odds_yes: number
  odds_no: number
  total_liquidity: number
}
