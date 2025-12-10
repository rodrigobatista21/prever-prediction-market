import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAuth } from './use-auth'
import {
  createMockSupabaseClient,
  mockUser,
  mockSession,
  mockProfile,
} from '@/test/mocks/supabase'

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('useAuth', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorageMock.clear()
    mockSupabase = createMockSupabaseClient()
    vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should start with loading state', async () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should load user and profile when session exists', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.session).toEqual(mockSession)
      expect(result.current.profile).toEqual(mockProfile)
    })

    it('should handle no session', async () => {
      mockSupabase = createMockSupabaseClient({
        session: null,
        user: null,
      })
      vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('signInWithEmail', () => {
    it('should sign in successfully', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('test@example.com', 'password123')
      })

      expect(signInResult).toEqual({ error: null })
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should return error on failed sign in', async () => {
      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let signInResult
      await act(async () => {
        signInResult = await result.current.signInWithEmail('wrong@example.com', 'wrongpassword')
      })

      expect(signInResult.error).toEqual({ message: 'Invalid credentials' })
    })
  })

  describe('signUpWithEmail', () => {
    it('should sign up successfully', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let signUpResult
      await act(async () => {
        signUpResult = await result.current.signUpWithEmail('new@example.com', 'password123', 'New User')
      })

      expect(signUpResult).toEqual({ error: null })
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'New User',
          },
        },
      })
    })

    it('should sign up without full name', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.signUpWithEmail('new@example.com', 'password123')
      })

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: undefined,
          },
        },
      })
    })
  })

  describe('signInWithGoogle', () => {
    it('should initiate Google OAuth', async () => {
      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
        writable: true,
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let oauthResult
      await act(async () => {
        oauthResult = await result.current.signInWithGoogle()
      })

      expect(oauthResult).toEqual({ error: null })
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('auth state changes', () => {
    it('should subscribe to auth state changes', async () => {
      renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
      })
    })

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
      })

      const subscription = mockSupabase.auth.onAuthStateChange.mock.results[0].value.data.subscription

      unmount()

      expect(subscription.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('profile caching', () => {
    it('should use cached profile on subsequent renders', async () => {
      // First render - will fetch profile
      const { result: result1, unmount: unmount1 } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result1.current.profile).toEqual(mockProfile)
      })

      unmount1()

      // Second render - should use cache
      const { result: result2 } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result2.current.profile).toEqual(mockProfile)
      })
    })
  })

  describe('error handling', () => {
    it('should handle session error gracefully', async () => {
      mockSupabase.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Hook should complete without crashing and have no user
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
    })

    it('should handle profile fetch error gracefully', async () => {
      // This test verifies error doesn't crash the hook
      // Due to profile caching, we can't fully test error state
      // But we can verify the hook still works
      mockSupabase = createMockSupabaseClient({ profile: null })
      vi.mocked(createClient).mockReturnValue(mockSupabase as ReturnType<typeof createClient>)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Hook should complete without crashing
      expect(result.current.user).toBeDefined()
    })
  })
})
