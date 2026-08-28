import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Navigation, Calendar, Users, Search, Bus, Clock, ArrowRight, Menu, X,
  ShieldCheck, Armchair, Star, Banknote, Ticket, BadgeCheck, Wifi, UtensilsCrossed,
  UserCircle, LogOut,
} from 'lucide-react'
import { stopsApi, tripsApi } from '@/api'
import { formatDateTime, formatDuration, formatCurrency } from '@/lib/utils'
import { Select } from '@/components/shared'
import { useAuthStore } from '@/stores/auth'
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
  {
    icon: <Wifi className="w-7 h-7" />,
    title: 'Free Onboard Wi-Fi',
    desc: 'Stay connected the whole journey — every vehicle comes with complimentary Wi-Fi at no extra cost.',
  },
  {
    icon: <UtensilsCrossed className="w-7 h-7" />,
    title: 'Free Meals & Snacks',
    desc: 'Sit back and relax — complimentary food and refreshments are included with every trip, no matter the distance.',
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
  const { isAuthenticated, user, logout } = useAuthStore()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [passengers, setPassengers] = useState(1)
  const [searched, setSearched] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const appliedIncomingParams = useRef(false)

  // Stops that can be a valid pickup point (From options).
  const { data: fromStops = [] } = useQuery<Stop[]>({
    queryKey: ['stops', 'active'],
    queryFn: stopsApi.findActive,
  })

  // Stops reachable from the selected pickup (To options) — depends on `from`.
  const { data: toStops = [], isFetching: isFetchingToStops } = useQuery<Stop[]>({
    queryKey: ['stops', 'destinations', from],
    queryFn: () => stopsApi.findDestinationsFrom(from),
    enabled: !!from,
  })

  // If the previously selected destination is no longer reachable from the new
  // pickup (or no pickup is selected), clear it rather than leave a stale value.
  // Skipped while toStops is (re)fetching so an in-flight query param match isn't clobbered.
  useEffect(() => {
    if (isFetchingToStops) return
    if (to && (!from || !toStops.some((s) => s.id === to))) setTo('')
  }, [toStops, to, from, isFetchingToStops])

  // All stops, used only to resolve external-link query params (?from=Abuja&to=Kaduna&date=...) by name.
  const { data: allStops = [] } = useQuery<Stop[]>({
    queryKey: ['stops'],
    queryFn: stopsApi.findAll,
  })

  useEffect(() => {
    if (appliedIncomingParams.current || allStops.length === 0) return
    appliedIncomingParams.current = true

    const fromName = searchParams.get('from')
    const toName = searchParams.get('to')
    const dateParam = searchParams.get('date')

    const matchedFrom = fromName ? allStops.find((s) => s.name.toLowerCase() === fromName.toLowerCase()) : undefined
    const matchedTo = toName ? allStops.find((s) => s.name.toLowerCase() === toName.toLowerCase()) : undefined

    if (matchedFrom) setFrom(matchedFrom.id)
    if (matchedTo) setTo(matchedTo.id)
    if (dateParam) setDate(dateParam)

    if (matchedFrom && matchedTo && matchedFrom.id !== matchedTo.id) {
      setSearched(true)
      requestAnimationFrame(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [allStops, searchParams])

  const { data: results = [], isLoading } = useQuery<Trip[]>({
    queryKey: ['trips-search', from, to, date],
    queryFn: () => tripsApi.search(from, to, date),
    enabled: searched && !!from && !!to && !!date,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!from || !to || from === to) return
    setSearched(true)
    // Wait a frame so the (conditionally rendered) results section has mounted before scrolling to it.
    requestAnimationFrame(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface">

      {/* ── Navigation ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-surface shadow-sm">
        <nav className="flex items-center justify-between px-6 max-w-6xl mx-auto h-20">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MaidAutos" className="h-10 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-bold text-primary border-b-2 border-primary pb-1">How It Works</a>
            <Link to="/routes" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Routes</Link>
            <a href="#why-us" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Why Us</a>
            <div className="h-6 w-px bg-outline-variant" />
            {isAuthenticated ? (
              <>
                <Link
                  to="/account/bookings"
                  className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                >
                  <UserCircle className="w-5 h-5" />
                  {user?.firstName || 'My Bookings'}
                </Link>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-primary text-on-primary px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all whitespace-nowrap"
                >
                  Register
                </button>
              </>
            )}
          </div>
          <button
            className="md:hidden p-2 text-primary"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-outline-variant px-6 py-4 flex flex-col gap-4 bg-surface">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-bold text-primary">How It Works</a>
            <Link to="/routes" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-on-surface-variant">Routes</Link>
            <a href="#why-us" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-on-surface-variant">Why Us</a>
            <div className="h-px w-full bg-outline-variant" />
            {isAuthenticated ? (
              <>
                <Link
                  to="/account/bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium text-on-surface-variant"
                >
                  <UserCircle className="w-4 h-4" />
                  {user?.firstName || 'My Bookings'}
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); logout() }}
                  className="flex items-center gap-2 text-left text-sm font-medium text-on-surface-variant"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/login') }}
                  className="text-left text-sm font-medium text-on-surface-variant"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/register') }}
                  className="bg-primary text-on-primary px-6 py-2.5 rounded-xl text-sm font-bold text-center"
                >
                  Register
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── Hero & Search ────────────────────────────────────────── */}
      <section className="relative pt-20 pb-32 px-4">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(#8b1a1a 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 text-center mb-14">
          <p className="text-primary uppercase tracking-[0.2em] text-xs font-bold mb-6">
            Premium Intercity Travel
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-on-surface leading-tight mb-6 max-w-4xl mx-auto">
            Book your seat, travel with <span className="text-primary">confidence</span>
          </h1>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-lg">
            Experience the new standard of Nigerian intercity travel. Safe, punctual, and premium service for the modern traveler.
          </p>
        </div>

        {/* Search Widget */}
        <div id="search" className="relative z-10 max-w-5xl mx-auto bg-surface p-3 rounded-2xl shadow-xl border border-outline-variant">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch gap-3 md:gap-1">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-0">
              <div className="px-4 py-2.5 md:px-5 flex flex-col items-start border border-outline-variant rounded-xl md:border-0 md:border-r md:rounded-none hover:bg-surface-rose transition-colors">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">From</label>
                <div className="flex items-center gap-2 w-full">
                  <MapPin className="w-4 h-4 text-gray-muted shrink-0" />
                  <Select
                    value={from}
                    onChange={setFrom}
                    placeholder="Select departure"
                    options={fromStops.map((s) => ({ value: s.id, label: s.name }))}
                    className="w-full bg-transparent p-0 text-on-surface font-semibold text-sm"
                  />
                </div>
              </div>

              <div className="px-4 py-2.5 md:px-5 flex flex-col items-start border border-outline-variant rounded-xl md:border-0 md:border-r md:rounded-none hover:bg-surface-rose transition-colors">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">To</label>
                <div className="flex items-center gap-2 w-full">
                  <Navigation className="w-4 h-4 text-gray-muted shrink-0" />
                  <Select
                    value={to}
                    onChange={setTo}
                    placeholder={from ? 'Select destination' : 'Select departure first'}
                    options={toStops.map((s) => ({ value: s.id, label: s.name }))}
                    className="w-full bg-transparent p-0 text-on-surface font-semibold text-sm"
                  />
                </div>
              </div>

              <div className="px-4 py-2.5 md:px-5 flex flex-col items-start border border-outline-variant rounded-xl md:border-0 md:border-r md:rounded-none hover:bg-surface-rose transition-colors">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Date</label>
                <div className="flex items-center gap-2 w-full">
                  <Calendar className="w-4 h-4 text-gray-muted shrink-0" />
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-on-surface font-semibold focus:ring-0 outline-none cursor-pointer text-sm"
                    required
                  />
                </div>
              </div>

              <div className="px-4 py-2.5 md:px-5 flex flex-col items-start rounded-xl hover:bg-surface-rose transition-colors">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Passengers</label>
                <div className="flex items-center gap-2 w-full">
                  <Users className="w-4 h-4 text-gray-muted shrink-0" />
                  <Select
                    value={String(passengers)}
                    onChange={(v) => setPassengers(Number(v))}
                    options={[
                      { value: '1', label: '1 Passenger' },
                      { value: '2', label: '2 Passengers' },
                      { value: '3', label: '3 Passengers' },
                      { value: '4', label: 'Group (4+)' },
                    ]}
                    className="w-full bg-transparent p-0 text-on-surface font-semibold text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="bg-primary text-on-primary px-10 py-4 md:py-0 rounded-xl font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ── Search Results ───────────────────────────────────────── */}
      {searched && (
        <section id="results" className="bg-surface-container px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-xl font-bold text-on-surface mb-6">Available Trips</h2>
            {isLoading ? (
              <div className="text-center py-16 text-on-surface-variant">Searching trips...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-2xl border border-outline-variant">
                <Bus className="w-12 h-12 text-outline-variant mx-auto mb-3" />
                <p className="text-on-surface font-semibold">No trips found</p>
                <p className="text-on-surface-variant text-sm mt-1">Try a different date or route</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-on-surface-variant text-sm">{results.length} trip{results.length !== 1 ? 's' : ''} available</p>
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
                      className="bg-surface rounded-xl border border-outline-variant p-5 cursor-pointer hover:border-primary hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 font-semibold text-on-surface">
                          <span>{trip.route.originStop.name}</span>
                          <ArrowRight className="w-4 h-4 text-gray-muted group-hover:text-primary transition-colors" />
                          <span>{trip.route.destinationStop.name}</span>
                        </div>
                        <span className="text-primary font-bold text-xl">{formatCurrency(price)}</span>
                      </div>
                      <div className="flex items-center gap-5 text-sm text-on-surface-variant">
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
                      <div className="mt-2.5 flex items-center gap-3 text-xs text-primary/80 font-medium">
                        <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> Free Wi-Fi</span>
                        <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> Free Meals</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          trip.status === 'BOARDING'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-surface-rose text-primary'
                        }`}>
                          {trip.status}
                        </span>
                        <span className="text-primary text-sm font-semibold group-hover:underline">
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

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-surface-container">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-bold uppercase tracking-widest mb-3">Simple &amp; Fast</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-on-surface">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Search className="w-7 h-7" />, step: '1', title: 'Search your route', desc: 'Pick your departure city, destination, and travel date to see available trips.' },
              { icon: <Ticket className="w-7 h-7" />, step: '2', title: 'Book & pay securely', desc: 'Choose your trip, pay online, and get your e-ticket instantly by email.' },
              { icon: <Bus className="w-7 h-7" />, step: '3', title: 'Travel with confidence', desc: 'Arrive at your boarding stop and enjoy a safe, comfortable, on-time journey.' },
            ].map((item) => (
              <div key={item.step} className="relative bg-surface border border-outline-variant rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-6">
                  {item.icon}
                </div>
                <div className="absolute top-4 right-4 text-3xl font-display font-extrabold text-primary/10">{item.step}</div>
                <h3 className="font-display text-xl font-bold mb-3 text-on-surface">{item.title}</h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ────────────────────────────────────────── */}
      <section id="why-us" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <p className="text-primary text-sm font-bold uppercase tracking-widest mb-3">Premium Standards</p>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold text-on-surface leading-tight">Elevating the Nigerian travel experience</h2>
          </div>
          <p className="text-on-surface-variant max-w-sm">We combine modern technology with operational excellence to ensure every mile of your journey is exceptional.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((item) => (
            <div key={item.title} className="p-8 bg-surface-rose-alt border border-outline-variant rounded-2xl group hover:border-primary hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                {item.icon}
              </div>
              <h3 className="font-display text-xl font-bold mb-4 text-on-surface">{item.title}</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Operational Stats ────────────────────────────────────── */}
      <section className="py-16 bg-primary-dark text-on-primary">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl font-extrabold mb-2" style={{ color: '#ffb4a8' }}>{s.value}</div>
              <p className="text-sm opacity-70 uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="py-24 bg-surface-container overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-bold uppercase tracking-widest mb-2">Passenger Stories</p>
            <h2 className="font-display text-3xl font-extrabold text-on-surface">Trusted by 200,000+ Nigerians</h2>
          </div>
        </div>
        <div className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none gap-6 px-6 md:px-6 max-w-6xl mx-auto pb-4 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="min-w-[280px] md:min-w-0 shrink-0 md:shrink snap-center p-6 bg-surface border border-outline-variant rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                  {t.initials}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface">{t.name}</h4>
                  <p className="text-[11px] text-on-surface-variant font-medium">{t.route}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── App CTA ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <h2 className="font-display text-4xl md:text-5xl font-extrabold text-on-surface leading-tight">Ready to start your journey?</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed">Book your seat in seconds, track your bus in real-time, and manage your travel history all in one place.</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full sm:w-auto bg-primary text-on-primary px-10 py-5 rounded-xl font-bold text-lg hover:brightness-110 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Ticket className="w-5 h-5" />
                Book Your Trip Now
              </button>
              <Link
                to="/routes"
                className="w-full sm:w-auto bg-surface border-2 border-primary text-primary px-8 py-5 rounded-xl font-bold text-lg hover:bg-surface-rose transition-all text-center"
              >
                View Routes
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="w-full aspect-square bg-primary/10 rounded-3xl overflow-hidden flex items-center justify-center p-8 border border-primary/10">
              <div
                className="w-full h-full rounded-2xl shadow-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #610000 0%, #8b1a1a 100%)' }}
              >
                <Bus className="w-20 h-20 text-white/70" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-primary-dark text-on-primary pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <img src="/logo.png" alt="MaidAutos" className="h-10 w-auto brightness-0 invert" />
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Connecting Nigeria's major cities with a focus on safety, reliability, and passenger comfort.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8" style={{ color: '#ffb4a8' }}>Company</h4>
            <ul className="space-y-5">
              <li><a className="text-sm text-white/60 hover:text-white transition-colors" href="#how-it-works">How It Works</a></li>
              <li><Link className="text-sm text-white/60 hover:text-white transition-colors" to="/routes">Routes</Link></li>
              <li><a className="text-sm text-white/60 hover:text-white transition-colors" href="#why-us">Why MaidAutos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8" style={{ color: '#ffb4a8' }}>Support</h4>
            <ul className="space-y-5">
              <li><a className="text-sm text-white/60 hover:text-white transition-colors" href="mailto:maidautosolutions@gmail.com">maidautosolutions@gmail.com</a></li>
              <li><a className="text-sm text-white/60 hover:text-white transition-colors" href="tel:+2349122222656">0912 222 2656</a></li>
              <li><a className="text-sm text-white/60 hover:text-white transition-colors" href="tel:+2349122222856">0912 222 2856</a></li>
              {isAuthenticated ? (
                <>
                  <li><Link to="/account/bookings" className="text-sm text-white/60 hover:text-white transition-colors">My Bookings</Link></li>
                  <li><button onClick={logout} className="text-sm text-white/60 hover:text-white transition-colors">Sign Out</button></li>
                </>
              ) : (
                <>
                  <li><button onClick={() => navigate('/register')} className="text-sm text-white/60 hover:text-white transition-colors">Create Account</button></li>
                  <li><button onClick={() => navigate('/login')} className="text-sm text-white/60 hover:text-white transition-colors">Sign In</button></li>
                </>
              )}
            </ul>
          </div>
          <div className="space-y-8">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#ffb4a8' }}>Payment Security</h4>
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10" style={{ color: '#ffb4a8' }}>
                <BadgeCheck className="w-6 h-6" />
                <div>
                  <p className="text-xs font-bold text-white">Paystack Secured</p>
                  <p className="text-[10px] text-white/40">PCI-DSS Level 1 compliant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Link className="text-[11px] font-medium text-white/40 hover:text-white transition-colors" to="/privacy">Privacy Policy</Link>
              <Link className="text-[11px] font-medium text-white/40 hover:text-white transition-colors" to="/terms">Terms &amp; Conditions</Link>
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
