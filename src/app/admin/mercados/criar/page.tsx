'use client'

import { CreateMarketForm } from '@/components/admin/CreateMarketForm'

export default function CriarMercadoPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Criar Mercado</h1>
        <p className="text-muted-foreground">
          Crie um novo mercado de previsão para os usuários apostarem
        </p>
      </div>

      {/* Form */}
      <CreateMarketForm />
    </div>
  )
}
