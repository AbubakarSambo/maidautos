import { Mail, Phone } from 'lucide-react'
import { ContactForm } from '@/components/shared'
import { PageShell } from './PageShell'

export function ContactPage() {
  return (
    <PageShell title="Contact Us" proseStyles={false}>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <p className="text-on-surface-variant leading-relaxed">
            Have a question, an issue with a booking, or feedback for us? Send a message and our team will get back to you.
          </p>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Mail className="w-4 h-4 text-primary" /> help@maidautos.com
          </div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <Phone className="w-4 h-4 text-primary" /> 0912 222 2656 / 0912 222 2856 / 0808 126 0175
          </div>
        </div>

        <ContactForm />
      </div>
    </PageShell>
  )
}
