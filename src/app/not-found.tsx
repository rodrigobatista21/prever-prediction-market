import { FileQuestion, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <FileQuestion className="w-10 h-10 text-muted-foreground" />
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-xl font-semibold">Pagina nao encontrada</h2>
        <p className="text-muted-foreground max-w-md">
          A pagina que voce esta procurando nao existe ou foi movida.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/">
          <Button variant="default">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao inicio
          </Button>
        </Link>
      </div>
    </div>
  )
}
