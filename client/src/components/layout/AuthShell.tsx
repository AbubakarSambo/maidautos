import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-primary-dark">
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#ffb4a8 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="flex justify-center mb-8">
          <img src="/logo.png" alt="MaidAutos" className="h-12 w-auto brightness-0 invert" />
        </Link>
        <div className="bg-surface rounded-2xl shadow-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
