import { vi } from 'vitest'
import type { User, Session } from '@supabase/supabase-js'

// Mock user for testing
export const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
}

// Mock session
export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
}

// Mock profile
export const mockProfile = {
  id: 'test-user-123',
  full_name: 'Test User',
  avatar_url: null,
  is_admin: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
}

// Create a mock Supabase client factory
export function createMockSupabaseClient(overrides: {
  session?: Session | null
  user?: User | null
  profile?: typeof mockProfile | null
  balance?: number
  rpcResponses?: Record<string, unknown>
} = {}) {
  const {
    session = mockSession,
    user = mockUser,
    profile = mockProfile,
    balance = 1000,
    rpcResponses = {},
  } = overrides

  // Auth state change callbacks
  const authCallbacks: Array<(event: string, session: Session | null) => void> = []

  const mockClient = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user, session },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user, session },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: 'https://oauth.example.com' },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn((callback) => {
        authCallbacks.push(callback)
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: table === 'profiles' ? profile : null,
        error: null,
      }),
    })),
    rpc: vi.fn((fnName: string, params?: Record<string, unknown>) => {
      // Default RPC responses
      const defaultResponses: Record<string, unknown> = {
        get_user_balance: balance,
        rpc_buy_shares: {
          success: true,
          shares_bought: 90.909,
          new_balance: 900,
          new_pool_yes: 1100,
          new_pool_no: 909.09,
        },
        rpc_sell_shares: {
          success: true,
          amount_received: 47.62,
          new_balance: 1047.62,
          new_pool_yes: 952.38,
          new_pool_no: 1050,
        },
        rpc_deposit_mock: {
          success: true,
          new_balance: balance + (params?.p_amount as number || 100),
        },
      }

      const response = rpcResponses[fnName] ?? defaultResponses[fnName]
      return Promise.resolve({
        data: response,
        error: null,
      })
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
    removeChannel: vi.fn(),

    // Helper to trigger auth state change
    _triggerAuthStateChange: (event: string, newSession: Session | null) => {
      authCallbacks.forEach((cb) => cb(event, newSession))
    },
  }

  return mockClient
}

// Mock the createClient function
export const mockCreateClient = vi.fn(() => createMockSupabaseClient())
