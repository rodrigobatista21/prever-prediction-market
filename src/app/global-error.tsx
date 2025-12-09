'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error:', error)
  }, [error])

  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Erro Critico</h1>
            <p className="text-zinc-400 max-w-md">
              Ocorreu um erro grave na aplicacao. Por favor, recarregue a pagina.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-w-md w-full">
            <p className="text-sm text-zinc-400 font-mono break-all">
              {error.message || 'Erro desconhecido'}
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-500 mt-2">
                ID: {error.digest}
              </p>
            )}
          </div>

          <button
            onClick={reset}
            className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar pagina
          </button>
        </div>
      </body>
    </html>
  )
}
