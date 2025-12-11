'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/layout/AdminSidebar'
import { AdminHeader } from '@/components/admin/layout/AdminHeader'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const supabase = createClient()

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.is_admin ?? false)
    }

    if (!authLoading) {
      checkAdmin()
    }
  }, [user, authLoading, supabase])

  // Fetch pending markets count
  useEffect(() => {
    async function fetchPendingCount() {
      const { count } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .is('outcome', null)
        .lt('ends_at', new Date().toISOString())

      setPendingCount(count ?? 0)
    }

    if (isAdmin) {
      fetchPendingCount()
    }
  }, [isAdmin, supabase])

  // Redirect if not admin
  useEffect(() => {
    if (isAdmin === false) {
      router.push('/')
    }
  }, [isAdmin, router])

  // Loading state
  if (authLoading || isAdmin === null) {
    return (
      <div className="flex h-screen">
        <div className="w-64 border-r bg-card p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="h-16 border-b bg-card px-6 flex items-center">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not admin - will redirect
  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar pendingCount={pendingCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader notificationCount={pendingCount} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
