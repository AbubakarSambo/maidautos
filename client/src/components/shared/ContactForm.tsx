import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { contactApi } from '@/api'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [company, setCompany] = useState('') // honeypot — left blank by real users

  const { mutate: send, isPending } = useMutation({
    mutationFn: () => contactApi.send({ name, email, subject: subject || undefined, message, company: company || undefined }),
    onSuccess: () => {
      toast.success("Message sent — we'll get back to you soon")
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not send your message — please try again'),
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); send() }}
      className="space-y-4 bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm"
    >
      {/* Honeypot — hidden from real users via CSS, bots fill every field */}
      <input
        type="text"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] w-px h-px overflow-hidden"
        aria-hidden="true"
      />

      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Email *</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={150}
          className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Message *</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={5}
          className="mt-1.5 w-full px-3 py-2.5 border border-outline-variant rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-colors"
      >
        {isPending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
