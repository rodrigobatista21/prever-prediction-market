'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/database.types'

interface UseAuthReturn {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

// Cache profile in memory and sessionStorage to avoid refetching
const profileCache = new Map<string, Profile>()

// Try to restore from sessionStorage on module load
if (typeof window !== 'undefined') {
  try {
    const cached = sessionStorage.getItem('profile_cache')
    if (cached) {
      const parsed = JSON.parse(cached)
      Object.entries(parsed).forEach(([k, v]) => profileCache.set(k, v as Profile))
    }
  } catch {}
}

function persistCache() {
  if (typeof window !== 'undefined') {
    try {
      const obj: Record<string, Profile> = {}
      profileCache.forEach((v, k) => obj[k] = v)
      sessionStorage.setItem('profile_cache', JSON.stringify(obj))
    } catch {}
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    // Check cache first
    const cached = profileCache.get(userId)
    if (cached) {
      setProfile(cached)
      return cached
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        return null
      }

      if (data) {
        profileCache.set(userId, data)
        persistCache()
        setProfile(data)
      }
      return data
    } catch {
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Prevent duplicate initialization
    if (initialized.current) return
    initialized.current = true

    let mounted = true

    // Get initial session - optimized for speed
    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          setIsLoading(false)
          return
        }

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          // Check cache immediately
          const cached = profileCache.get(currentSession.user.id)
          if (cached) {
            setProfile(cached)
            setIsLoading(false)
          } else {
            // Fetch profile (will set loading to false after)
            await fetchProfile(currentSession.user.id)
            if (mounted) setIsLoading(false)
          }
        } else {
          setIsLoading(false)
        }
      } catch {
        if (mounted) setIsLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      initialized.current = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }, [supabase])

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    fullName?: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { error: error as Error | null }
  }, [supabase])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error: error as Error | null }
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  return {
    user,
    profile,
    session,
    isLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  }
}
