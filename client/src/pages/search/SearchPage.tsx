import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Calendar, Search, Bus, Clock, ArrowRight, Menu, ChevronDown,
  ShieldCheck, Armchair, Star, Banknote, Ticket, Share2, Globe,
} from 'lucide-react'
import { stopsApi, tripsApi } from '@/api'
import { formatDateTime, formatDuration, formatCurrency } from '@/lib/utils'
import type { Stop, Trip } from '@/types'

const FEATURES = [
  {
    icon: <ShieldCheck className="w-7 h-7" />,
    title: 'Unmatched Safety',
    desc: 'Real-time GPS tracking, speed limiters, and mandatory 48-point safety checks for every vehicle before departure.',
  },
  {
    icon: <Clock className="w-7 h-7" />,
    title: 'Precision Timing',
    desc: 'We pride ourselves on 98% on-time departures. No waiting at the terminal for the bus to fill up.',
  },
  {
    icon: <Armchair className="w-7 h-7" />,
    title: 'Executive Comfort',
    desc: 'Ergonomic leather seating, climate-controlled interiors, and onboard entertainment systems for long-haul trips.',
  },
  {
    icon: <Banknote className="w-7 h-7" />,
    title: 'Fair Economics',
    desc: 'Competitive, transparent pricing with loyalty rewards for frequent travelers. No peak-period surcharges for app users.',
  },
]

const STATS = [
  { value: '50k+', label: 'Trips Completed' },
  { value: '120+', label: 'Active Coaches' },
  { value: '45', label: 'Terminals Nationwide' },
  { value: '4.8/5', label: 'User Rating' },
]

const TESTIMONIALS = [
  {
    name: 'Adewale M.',
    initials: 'AM',
    route: 'Abuja → Kano',
    text: 'Booked online in under 2 minutes. The vehicle was clean, AC was cold, and we arrived exactly on time. Best intercity service I\'ve used.',
  },
  {
    name: 'Chioma N.',
    initials: 'CN',
    route: 'Abuja → Jos',
    text: 'MaidAutos is hands down the most reliable option for North-bound travel. Professional drivers and very comfortable executive seats.',
  },
  {
    name: 'Olumide I.',
    initials: 'OI',
    route: 'Abuja → Maiduguri',
    text: 'Smooth booking, fair price, and the driver was courteous. Highly recommend to anyone travelling up north who values their peace of mind.',
  },
]

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [searched, setSearched] = useState(false)
  const appliedIncomingParams = useRef(false)

  const { data: stops = [] } = useQuery<Stop[]>({
    queryKey: ['stops'],
    queryFn: stopsApi.findAll,
  })

  // Carry From/To/Date over from the marketing site's search widget (?from=Abuja&to=Kaduna&date=...)
  useEffect(() => {
    if (appliedIncomingParams.current || stops.length === 0) return
    appliedIncomingParams.current = true

    const fromName = searchParams.get('from')
    const toName = searchParams.get('to')
    const dateParam = searchParams.get('date')

    const matchedFrom = fromName ? stops.find((s) => s.name.toLowerCase() === fromName.toLowerCase()) : undefined
    const matchedTo = toName ? stops.find((s) => s.name.toLowerCase() === toName.toLowerCase()) : undefined

    if (matchedFrom) setFrom(matchedFrom.id)
    if (matchedTo) setTo(matchedTo.id)
    if (dateParam) setDate(dateParam)

    if (matchedFrom && matchedTo && matchedFrom.id !== matchedTo.id) {
      setSearched(true)
      requestAnimationFrame(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [stops, searchParams])

  const { data: results = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['trips-search', from, to, date],
    queryFn: () => tripsApi.search(from, to, date),
    enabled: searched && !!from && !!to && !!date,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!from || !to || from === to) return
    setSearched(true)
    if (searched) {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navigation ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-white/5">
        <nav className="flex items-center justify-between px-6 max-w-6xl mx-auto h-20">
          <div className="flex items-center gap-2 text-white">
            <Bus className="w-7 h-7 shrink-0 text-green-300" />
            <span className="text-xl font-bold tracking-tight">MaidAutos</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-semibold text-white relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-green-500">How It Works</a>
            <a href="#" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Routes</a>
            <a href="#why-us" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Why Us</a>
            <div className="h-6 w-px bg-white/10" />
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-green-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-green-500 transition-colors shadow-lg shadow-green-900/30 whitespace-nowrap"
            >
              Register
            </button>
          </div>
          <button className="md:hidden p-2 text-white" aria-label="Menu">
            <Menu className="w-6 h-6" />
          </button>
        </nav>
      </header>

      {/* ── Hero & Search ────────────────────────────────────────── */}
      <section
        className="relative pt-20 pb-24 px-4 border-b border-white/5 overflow-hidden"
        style={{ backgroundColor: '#0b1c30' }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(34, 197, 94, 0.15) 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 text-center mb-14">
          <p className="text-green-300 uppercase tracking-[0.2em] text-xs font-bold mb-6">
            Premium Intercity Travel
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 max-w-4xl mx-auto">
            Seamless bookings for your next intercity journey
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto">
            Join thousands of travelers who trust MaidAutos for comfortable, safe, and on-time trips across Nigeria.
          </p>
        </div>

        {/* Search Widget */}
        <div className="relative z-10 max-w-5xl mx-auto bg-white p-4 md:p-3 rounded-2xl md:rounded-full shadow-2xl border border-white/10">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch gap-3 md:gap-2">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-0 md:divide-x divide-gray-100">
              <div className="px-4 py-3 md:px-6 flex flex-col items-start border border-gray-200 rounded-xl md:border-0 md:rounded-none">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Departure</label>
                <div className="relative flex items-center gap-2 w-full">
                  <MapPin className="w-5 h-5 text-green-600 shrink-0" />
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-transparent border-none p-0 pr-5 text-gray-900 font-semibold focus:ring-0 outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select departure</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="px-4 py-3 md:px-6 flex flex-col items-start border border-gray-200 rounded-xl md:border-0 md:rounded-none">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Destination</label>
                <div className="relative flex items-center gap-2 w-full">
                  <MapPin className="w-5 h-5 text-green-600 shrink-0" />
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-transparent border-none p-0 pr-5 text-gray-900 font-semibold focus:ring-0 outline-none appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select destination</option>
                    {stops.filter((s) => s.id !== from).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="px-4 py-3 md:px-6 flex flex-col items-start border border-gray-200 rounded-xl md:border-0 md:rounded-none">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                <div className="flex items-center gap-2 w-full">
                  <Calendar className="w-5 h-5 text-green-600 shrink-0" />
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-gray-900 font-semibold focus:ring-0 outline-none cursor-pointer"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="bg-green-600 text-white px-10 py-4 md:py-0 rounded-xl md:rounded-full font-bold text-sm hover:bg-green-500 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-green-900/30"
            >
              <Search className="w-5 h-5" />
              Search Available Trips
            </button>
          </form>
        </div>
      </section>

      {/* ── Search Results ───────────────────────────────────────── */}
      {searched && (
        <section id="results" className="bg-gray-50 px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Available Trips</h2>
            {isLoading ? (
              <div className="text-center py-16 text-gray-400">Searching trips...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border">
                <Bus className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold">No trips found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different date or route</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-500 text-sm">{results.length} trip{results.length !== 1 ? 's' : ''} available</p>
                {results.map((trip) => {
                  const fromStop = trip.route.routeStops.find((rs) => rs.stopId === from)
                  const toStop = trip.route.routeStops.find((rs) => rs.stopId === to)
                  const price = toStop && fromStop
                    ? Number(toStop.priceFromOrigin) - Number(fromStop.priceFromOrigin)
                    : 0

                  return (
                    <div
                      key={trip.id}
                      onClick={() => navigate(`/trips/${trip.id}?from=${from}&to=${to}`)}
                      className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:border-green-400 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 font-semibold text-gray-900">
                          <span>{trip.route.originStop.name}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                          <span>{trip.route.destinationStop.name}</span>
                        </div>
                        <span className="text-green-600 font-bold text-xl">{formatCurrency(price)}</span>
                      </div>
                      <div className="flex items-center gap-5 text-sm text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTime(trip.departureDateTime)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(trip.route.estimatedDurationMinutes)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5" />
                          {trip.car.make} {trip.car.model}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          trip.status === 'BOARDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {trip.status}
                        </span>
                        <span className="text-green-600 text-sm font-semibold group-hover:underline">
                          Book Now →
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Why Choose Us ────────────────────────────────────────── */}
      <section id="why-us" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <p className="text-green-600 text-sm font-bold uppercase tracking-widest mb-3">Premium Standards</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">Elevating the Nigerian travel experience</h2>
          </div>
          <p className="text-gray-500 max-w-sm">We combine modern technology with operational excellence to ensure every mile of your journey is exceptional.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((item) => (
            <div key={item.title} className="p-8 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-green-300 hover:shadow-xl hover:shadow-green-900/5 transition-all duration-300">
              <div className="w-14 h-14 bg-green-600/10 text-green-700 rounded-xl flex items-center justify-center mb-8 group-hover:bg-green-600 group-hover:text-white transition-colors">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{item.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Operational Stats ────────────────────────────────────── */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-extrabold text-green-300 mb-2">{s.value}</div>
              <p className="text-sm opacity-60 uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-green-600 text-sm font-bold uppercase tracking-widest mb-2">Passenger Stories</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Trusted by 200,000+ Nigerians</h2>
          </div>
        </div>
        <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none gap-6 px-6 md:px-6 max-w-6xl mx-auto pb-4 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="min-w-[280px] md:min-w-0 shrink-0 md:shrink snap-center p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/10 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {t.initials}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{t.name}</h4>
                  <p className="text-[11px] text-gray-500 font-medium">{t.route}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── App CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">Ready to start your journey?</h2>
            <p className="text-lg text-gray-500 leading-relaxed">Book your seat in seconds, track your bus in real-time, and manage your travel history all in one place.</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full sm:w-auto bg-green-600 text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-green-500 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-green-900/30 active:scale-95"
              >
                <Ticket className="w-5 h-5" />
                Book Your Trip Now
              </button>
              <button className="w-full sm:w-auto bg-white border-2 border-green-600 text-green-700 px-8 py-5 rounded-full font-bold text-lg hover:bg-green-50 transition-all">
                View Routes
              </button>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="w-full aspect-square bg-green-600/10 rounded-3xl overflow-hidden flex items-center justify-center p-8 border border-green-600/10">
              <div
                className="w-full h-full rounded-2xl shadow-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' }}
              >
                <Bus className="w-20 h-20 text-white/70" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white pt-24 pb-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Bus className="w-7 h-7 text-green-300" />
              <span className="text-2xl font-bold tracking-tight">MaidAutos</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Connecting Nigeria's major cities with a focus on safety, reliability, and passenger comfort.
            </p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors" href="#">
                <Share2 className="w-4 h-4" />
              </a>
              <a className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors" href="#">
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-green-300 uppercase tracking-[0.2em] mb-8">Company</h4>
            <ul className="space-y-5">
              <li><a className="text-sm text-white/60 hover:text-green-300 transition-colors" href="#">About Us</a></li>
              <li><a className="text-sm text-white/60 hover:text-green-300 transition-colors" href="#why-us">Why MaidAutos</a></li>
              <li><a className="text-sm text-white/60 hover:text-green-300 transition-colors" href="#">Corporate Travel</a></li>
              <li><a className="text-sm text-white/60 hover:text-green-300 transition-colors" href="#">Partner with Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-green-300 uppercase tracking-[0.2em] mb-8">Support</h4>
            <ul className="space-y-5">
              <li><a className="text-sm text-white/60 hover:text-green-300 transition-colors" href="mailto:help@maidautos.com">help@maidautos.com</a></li>
              <li><a className="text-sm text-white/60 hover:text-green-300 transition-colors" href="tel:+2348000000000">+234 800 000 0000</a></li>
              <li><button onClick={() => navigate('/register')} className="text-sm text-white/60 hover:text-green-300 transition-colors">Create Account</button></li>
              <li><button onClick={() => navigate('/login')} className="text-sm text-white/60 hover:text-green-300 transition-colors">Sign In</button></li>
            </ul>
          </div>
          <div className="space-y-8">
            <div>
              <h4 className="text-xs font-bold text-green-300 uppercase tracking-[0.2em] mb-6">Payment Security</h4>
              <div className="flex items-center gap-3 text-green-300 bg-white/5 p-4 rounded-xl border border-white/10">
                <ShieldCheck className="w-6 h-6" />
                <div>
                  <p className="text-xs font-bold text-white">Paystack Secured</p>
                  <p className="text-[10px] text-white/40">PCI-DSS Level 1 compliant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a className="text-[11px] font-medium text-white/40 hover:text-white transition-colors" href="#">Privacy Policy</a>
              <a className="text-[11px] font-medium text-white/40 hover:text-white transition-colors" href="#">Terms &amp; Conditions</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-10 border-t border-white/5 text-center">
          <p className="text-[11px] text-white/30">© {new Date().getFullYear()} MaidAutos. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
