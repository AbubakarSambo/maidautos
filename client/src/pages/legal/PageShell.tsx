import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  title: string
  updated?: string
  contentClassName?: string
  proseStyles?: boolean
  children: ReactNode
}

export function PageShell({ title, updated, contentClassName, proseStyles = true, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background font-sans text-on-surface">
      <header className="sticky top-0 z-50 bg-surface shadow-sm">
        <nav className="flex items-center justify-between px-6 max-w-6xl mx-auto h-20">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="MaidAutos" className="h-10 w-auto" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back home
          </Link>
        </nav>
      </header>

      <main className={cn('max-w-3xl mx-auto px-6 py-16', contentClassName)}>
        <p className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-3">MaidAutos</p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-on-surface mb-2">{title}</h1>
        {updated && <p className="text-on-surface-variant text-sm mb-12">Last updated: {updated}</p>}

        <div
          className={cn(
            'space-y-10',
            proseStyles && '[&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mb-3 [&_p]:text-on-surface-variant [&_p]:leading-relaxed [&_li]:text-on-surface-variant [&_li]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5'
          )}
        >
          {children}
        </div>
      </main>

      <footer className="bg-primary-dark text-on-primary py-10 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-[11px] text-white/40">© {new Date().getFullYear()} MaidAutos. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-[11px] font-medium text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-[11px] font-medium text-white/60 hover:text-white transition-colors">Terms &amp; Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
