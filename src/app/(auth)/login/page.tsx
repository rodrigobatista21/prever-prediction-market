'use client'

import { useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TrendingUp, Loader2, Mail, ArrowLeft, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/hooks'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const resetCode = searchParams.get('code')

  const { signInWithEmail, signInWithGoogle, resetPassword } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const [processingCode, setProcessingCode] = useState(!!searchParams.get('code'))

  const supabase = createClient()

  // Escutar evento PASSWORD_RECOVERY do Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', !!session)

      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event received')
        setShowResetPassword(true)
        setProcessingCode(false)
      } else if (event === 'SIGNED_IN' && searchParams.get('code')) {
        // Usuário pode ter sido logado via código de recovery
        console.log('SIGNED_IN with code param - showing reset form')
        setShowResetPassword(true)
        setProcessingCode(false)
      }
    })

    // Verificar se já tem sessão (código pode ter sido processado)
    const code = searchParams.get('code')
    if (code) {
      setProcessingCode(true)

      // Timeout para não travar
      const timeoutId = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('Session found after timeout, showing reset form')
            setShowResetPassword(true)
          } else {
            setError('Link expirado ou inválido. Solicite um novo.')
          }
          setProcessingCode(false)
        })
      }, 3000)

      return () => {
        clearTimeout(timeoutId)
        subscription.unsubscribe()
      }
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [searchParams, supabase.auth])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error: authError } = await signInWithEmail(email, password)

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
    } else {
      router.push(redirect)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    const { error: authError } = await signInWithGoogle()

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Digite seu email')
      return
    }

    setIsLoading(true)
    setError(null)

    const { error: resetError } = await resetPassword(email)

    if (resetError) {
      setError(resetError.message)
    } else {
      setResetEmailSent(true)
    }
    setIsLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setIsLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setPasswordUpdated(true)
    }
    setIsLoading(false)
  }

  // Tela de loading enquanto processa código de reset
  if (processingCode) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Processando...</h2>
            <p className="text-muted-foreground">
              Verificando link de recuperação de senha
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de senha atualizada com sucesso
  if (passwordUpdated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold">Senha atualizada!</h2>
            <p className="text-muted-foreground">
              Sua senha foi alterada com sucesso. Você já pode fazer login.
            </p>
            <Button
              onClick={() => {
                setPasswordUpdated(false)
                setShowResetPassword(false)
                router.push('/login')
              }}
              className="mt-4"
            >
              Fazer login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de definir nova senha
  if (showResetPassword) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Definir nova senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Digite novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Atualizar senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de confirmação de email enviado
  if (resetEmailSent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold">Email enviado!</h2>
            <p className="text-muted-foreground">
              Enviamos um link de recuperação para <strong>{email}</strong>.
              Verifique sua caixa de entrada e spam.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setResetEmailSent(false)
                setShowForgotPassword(false)
              }}
              className="mt-4"
            >
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de esqueci minha senha
  if (showForgotPassword) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
            <CardDescription>
              Digite seu email para receber um link de recuperação
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Enviar link de recuperação
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <Button
              variant="ghost"
              className="w-full gap-2"
              onClick={() => {
                setShowForgotPassword(false)
                setError(null)
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Entrar no TesePro</CardTitle>
          <CardDescription>
            Acesse sua conta para negociar teses
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                ou com email
              </span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Entrar com Email
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Não tem uma conta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

function LoginSkeleton() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
