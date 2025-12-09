/**
 * Utilitários de formatação para o TesePro
 * Padrão brasileiro: pt-BR, BRL
 */

/**
 * Formata valor em Reais (R$)
 * @example formatBRL(1234.56) => "R$ 1.234,56"
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata porcentagem sem casas decimais
 * @example formatPercent(0.5432) => "54%"
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/**
 * Formata porcentagem a partir de valor já multiplicado
 * @example formatPercentRaw(54.32) => "54%"
 */
export function formatPercentRaw(value: number): string {
  return `${Math.round(value)}%`
}

/**
 * Formata quantidade de ações
 * @example formatShares(1234.567) => "1.234,57 ações"
 */
export function formatShares(value: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `${formatted} ações`
}

/**
 * Formata data relativa
 * @example formatRelativeDate(futureDate) => "em 5 dias"
 */
export function formatRelativeDate(date: Date | string): string {
  const target = new Date(date)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return 'Encerrado'
  }

  if (diffDays === 0) {
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    if (diffHours <= 0) return 'Encerrando...'
    if (diffHours === 1) return 'em 1 hora'
    return `em ${diffHours} horas`
  }

  if (diffDays === 1) return 'amanhã'
  if (diffDays < 7) return `em ${diffDays} dias`
  if (diffDays < 30) {
    const weeks = Math.ceil(diffDays / 7)
    return weeks === 1 ? 'em 1 semana' : `em ${weeks} semanas`
  }
  if (diffDays < 365) {
    const months = Math.ceil(diffDays / 30)
    return months === 1 ? 'em 1 mês' : `em ${months} meses`
  }

  const years = Math.ceil(diffDays / 365)
  return years === 1 ? 'em 1 ano' : `em ${years} anos`
}

/**
 * Formata data completa em português
 * @example formatDate(date) => "25 de outubro de 2026"
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Formata data e hora
 * @example formatDateTime(date) => "25/10/2026 às 20:00"
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${dateStr} às ${timeStr}`
}

/**
 * Parse valor BRL de string para número
 * @example parseBRL("R$ 1.234,56") => 1234.56
 */
export function parseBRL(value: string): number {
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(cleaned) || 0
}

/**
 * Formata ROI (Return on Investment)
 * @example formatROI(0.84) => "+84%"
 */
export function formatROI(value: number): string {
  const percent = Math.round(value * 100)
  return percent >= 0 ? `+${percent}%` : `${percent}%`
}
