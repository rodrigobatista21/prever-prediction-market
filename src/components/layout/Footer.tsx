'use client'

import Link from 'next/link'
import { TrendingUp, Twitter, Github, Mail, ExternalLink } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

const footerLinks = {
  produto: [
    { label: 'Mercados', href: '/' },
    { label: 'Como funciona', href: '/#como-funciona' },
    { label: 'FAQ', href: '/faq' },
  ],
  legal: [
    { label: 'Termos de Uso', href: '/termos' },
    { label: 'Privacidade', href: '/privacidade' },
    { label: 'Responsabilidade', href: '/responsabilidade' },
  ],
  recursos: [
    { label: 'API', href: '/api-docs', external: true },
    { label: 'Documentação', href: '/docs', external: true },
    { label: 'Status', href: '/status', external: true },
  ],
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-card/50 mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-xl group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="tracking-tight">
                <span className="text-foreground">Tese</span>
                <span className="text-emerald-500">Pro</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plataforma profissional de análise preditiva. Dados, não apostas.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <SocialLink href="https://twitter.com/tesepro" icon={<Twitter className="w-4 h-4" />} label="Twitter" />
              <SocialLink href="https://github.com/tesepro" icon={<Github className="w-4 h-4" />} label="GitHub" />
              <SocialLink href="mailto:contato@tesepro.com.br" icon={<Mail className="w-4 h-4" />} label="Email" />
            </div>
          </div>

          {/* Produto */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Produto</h4>
            <ul className="space-y-3">
              {footerLinks.produto.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Recursos */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Recursos</h4>
            <ul className="space-y-3">
              {footerLinks.recursos.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href} external={link.external}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-border/50" />

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {currentYear} TesePro. Todos os direitos reservados.</p>
          <p className="text-xs">
            Análise preditiva envolve risco. Opere com responsabilidade.
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({
  href,
  children,
  external
}: {
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
      >
        {children}
        <ExternalLink className="w-3 h-3" />
      </a>
    )
  }

  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  )
}

function SocialLink({
  href,
  icon,
  label
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
    >
      {icon}
    </a>
  )
}
