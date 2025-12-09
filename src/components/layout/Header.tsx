'use client'

import Link from 'next/link'
import { TrendingUp, Wallet, Menu, LogOut, ChevronDown, Plus, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DepositModal } from '@/components/wallet/DepositModal'
import { useAuth, useBalance } from '@/lib/hooks'
import { formatBRL } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, profile, signOut, isLoading: authLoading } = useAuth()
  const { balance, refetch } = useBalance(user)

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '??'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline tracking-tight">
              <span className="text-foreground">Tese</span>
              <span className="text-emerald-500">Pro</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" active>
              <BarChart3 className="w-4 h-4" />
              Mercados
            </NavLink>
            {user && (
              <NavLink href="/minhas-apostas">
                <TrendingUp className="w-4 h-4" />
                Posições
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {authLoading ? (
            <div className="w-32 h-10 bg-muted animate-pulse rounded-lg" />
          ) : user ? (
            <>
              {/* Balance display */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{formatBRL(balance)}</span>
              </div>

              {/* Deposit button */}
              <DepositModal userId={user.id} onSuccess={refetch}>
                <Button size="sm" className="hidden sm:flex gap-1.5">
                  <Plus className="w-4 h-4" />
                  Depositar
                </Button>
              </DepositModal>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-border/50 hover:ring-primary/50 transition-all">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{profile?.full_name || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Mobile balance & deposit */}
                  <div className="sm:hidden p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Saldo</span>
                      <span className="font-semibold">{formatBRL(balance)}</span>
                    </div>
                    <DepositModal userId={user.id} onSuccess={refetch}>
                      <Button size="sm" className="w-full">
                        <Plus className="w-4 h-4 mr-1" />
                        Depositar
                      </Button>
                    </DepositModal>
                  </div>
                  <DropdownMenuSeparator className="sm:hidden" />

                  <DropdownMenuItem asChild>
                    <Link href="/carteira" className="cursor-pointer">
                      <Wallet className="w-4 h-4 mr-2" />
                      Carteira
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/minhas-apostas" className="cursor-pointer">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Minhas Posições
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-rose-500 focus:text-rose-500 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Criar conta</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <span>Tese<span className="text-emerald-500">Pro</span></span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                <MobileNavLink href="/">
                  <BarChart3 className="w-5 h-5" />
                  Mercados
                </MobileNavLink>
                {user && (
                  <>
                    <MobileNavLink href="/minhas-apostas">
                      <TrendingUp className="w-5 h-5" />
                      Minhas Posições
                    </MobileNavLink>
                    <MobileNavLink href="/carteira">
                      <Wallet className="w-5 h-5" />
                      Carteira
                    </MobileNavLink>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  children,
  active = false
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-smooth',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium hover:bg-muted transition-smooth"
    >
      {children}
    </Link>
  )
}
