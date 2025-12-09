'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console (in production, send to monitoring service)
    console.error('App Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-destructive" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Algo deu errado</h1>
        <p className="text-muted-foreground max-w-md">
          Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver.
        </p>
      </div>

      <Card className="max-w-md w-full border-border/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground font-mono break-all">
            {error.message || 'Erro desconhecido'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2">
              ID do erro: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
        <Link href="/">
          <Button variant="outline">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao inicio
          </Button>
        </Link>
      </div>
    </div>
  )
}
