'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Plus, Loader2, Calendar, DollarSign, ImageIcon, FileText, Upload, X, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdmin } from '@/lib/hooks/use-admin'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MarketCategory } from '@/lib/types/database.types'

const CATEGORY_OPTIONS: { value: MarketCategory; label: string }[] = [
  { value: 'politica', label: 'Política' },
  { value: 'economia', label: 'Economia' },
  { value: 'esportes', label: 'Esportes' },
  { value: 'entretenimento', label: 'Entretenimento' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'internacional', label: 'Internacional' },
  { value: 'outros', label: 'Outros' },
]

interface CreateMarketFormProps {
  onSuccess?: () => void
}

export function CreateMarketForm({ onSuccess }: CreateMarketFormProps) {
  const { createMarket, isLoading } = useAdmin()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<MarketCategory>('outros')
  const [endsAt, setEndsAt] = useState('')
  const [initialLiquidity, setInitialLiquidity] = useState('1000')
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo inválido. Use JPG, PNG, WebP ou GIF.')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.')
      return
    }

    setImageFile(file)
    setImageUrl('') // Clear URL if using file

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `markets/${fileName}`

    const { error } = await supabase.storage
      .from('market-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error('Erro ao fazer upload da imagem')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('market-images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Titulo é obrigatório')
      return
    }

    if (!endsAt) {
      toast.error('Data de encerramento é obrigatória')
      return
    }

    const liquidity = parseFloat(initialLiquidity) || 1000
    if (liquidity < 100) {
      toast.error('Liquidez mínima: R$ 100')
      return
    }

    let finalImageUrl = imageUrl.trim() || null

    // Upload image if file selected
    if (imageFile) {
      setIsUploading(true)
      try {
        finalImageUrl = await uploadImage(imageFile)
        toast.success('Imagem enviada!')
      } catch {
        toast.error('Erro ao enviar imagem')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    const result = await createMarket({
      title: title.trim(),
      description: description.trim(),
      category,
      ends_at: new Date(endsAt).toISOString(),
      initial_liquidity: liquidity,
      image_url: finalImageUrl,
    })

    if (result?.success) {
      toast.success('Mercado criado com sucesso!')
      // Reset form
      setTitle('')
      setDescription('')
      setCategory('outros')
      setEndsAt('')
      setInitialLiquidity('1000')
      setImageUrl('')
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onSuccess?.()
    } else {
      toast.error('Erro ao criar mercado')
    }
  }

  // Default to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().slice(0, 16)

  const isSubmitting = isLoading || isUploading

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Criar Novo Mercado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Titulo *
            </Label>
            <Input
              id="title"
              placeholder="Ex: Lula será reeleito em 2026?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-muted/50"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes sobre o mercado e critérios de resolução..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-muted/50 min-h-[80px]"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categoria *
            </Label>
            <Select value={category} onValueChange={(v) => setCategory(v as MarketCategory)}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ends At */}
          <div className="space-y-2">
            <Label htmlFor="endsAt" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data de Encerramento *
            </Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              min={minDate}
              className="bg-muted/50"
              required
            />
          </div>

          {/* Initial Liquidity */}
          <div className="space-y-2">
            <Label htmlFor="liquidity" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Liquidez Inicial (R$)
            </Label>
            <Input
              id="liquidity"
              type="number"
              min="100"
              step="100"
              placeholder="1000"
              value={initialLiquidity}
              onChange={(e) => setInitialLiquidity(e.target.value)}
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo R$ 100. Pools iniciam com este valor em cada lado (SIM/NÃO).
            </p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Imagem do Mercado
            </Label>

            {/* Preview or Upload Area */}
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                <div className="relative h-40 w-full">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="p-2 text-xs text-muted-foreground truncate">
                  {imageFile?.name}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed border-border/50 rounded-lg p-6',
                  'hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer',
                  'flex flex-col items-center justify-center gap-2 text-center'
                )}
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Clique para enviar</p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WebP ou GIF (máx. 5MB)
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Alternative: URL input */}
            {!imageFile && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  <span>ou cole uma URL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Input
                  type="url"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="bg-muted/50"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isUploading ? 'Enviando imagem...' : 'Criando...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Criar Mercado
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
