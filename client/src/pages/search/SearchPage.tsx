import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, Calendar, Search, Bus, Clock, ArrowRight,
  Shield, Star, Users, Banknote, CheckCircle, ChevronDown,
} from 'lucide-react'
import { stopsApi, tripsApi } from '@/api'
import { formatDateTime, formatDuration, formatCurrency } from '@/lib/utils'
import type { Stop, Trip } from '@/types'

export function SearchPage() {
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [searched, setSearched] = useState(false)

  const { data: stops = [] } = useQuery<Stop[]>({
    queryKey: ['stops'],
    queryFn: stopsApi.findAll,
  })

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
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5 text-green-700">
            <Bus className="w-7 h-7 shrink-0" />
            <span className="text-xl font-bold tracking-tight">MaidAutos</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <a href="#how-it-works" className="hidden md:block text-gray-600 hover:text-green-700 text-sm font-medium transition-colors">How It Works</a>
            <a href="#why-us" className="hidden md:block text-gray-600 hover:text-green-700 text-sm font-medium transition-colors">Why Us</a>
            <button
              onClick={() => navigate('/login')}
              className="hidden md:block text-gray-600 hover:text-green-700 text-sm font-medium transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-green-700 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-green-800 transition-colors whitespace-nowrap"
            >
              Register
            </button>
          </div>
        </nav>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[80vh] flex flex-col items-center justify-center px-4"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #059669 100%)',
        }}
      >
        {/* Decorative overlay pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 text-center mb-10">
          <p className="text-green-300 uppercase tracking-[0.3em] text-xs font-semibold mb-4">
            Nigeria's Trusted Intercity Transport
          </p>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4">
            RELIABLE. SAFE. ON TIME.
          </h1>
          <p className="text-green-200 text-lg max-w-xl mx-auto">
            Book comfortable intercity trips across Nigeria — from Abuja to Kano, Maiduguri, Jos and beyond.
          </p>
        </div>

        {/* Search Widget */}
        <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  From
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full pl-9 pr-8 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-gray-50 font-medium"
                    required
                  >
                    <option value="">Select departure</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  To
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full pl-9 pr-8 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-gray-50 font-medium"
                    required
                  >
                    <option value="">Select destination</option>
                    {stops.filter((s) => s.id !== from).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search Available Trips
            </button>
          </form>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40">
          <ChevronDown className="w-5 h-5 animate-bounce" />
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
      <section id="why-us" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green-600 text-sm font-bold uppercase tracking-widest mb-3">Why Choose Us</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Travel the way you deserve</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Shield className="w-7 h-7 text-green-600" />,
                title: 'Safety First',
                desc: 'Regularly maintained vehicles and vetted, experienced drivers on every trip.',
              },
              {
                icon: <Clock className="w-7 h-7 text-green-600" />,
                title: 'Always On Time',
                desc: 'We respect your schedule. Departures are prompt — no unnecessary delays.',
              },
              {
                icon: <Users className="w-7 h-7 text-green-600" />,
                title: 'Spacious & Comfortable',
                desc: 'Air-conditioned vehicles with ample legroom for a relaxing journey.',
              },
              {
                icon: <Banknote className="w-7 h-7 text-green-600" />,
                title: 'Fair Pricing',
                desc: 'Transparent fares with no hidden fees. Pay online or at the terminal.',
              },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green-600 text-sm font-bold uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl font-extrabold text-gray-900">Book your trip in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Search & Select',
                desc: 'Enter your departure city, destination, and travel date to view available trips.',
              },
              {
                step: '02',
                title: 'Book & Pay',
                desc: 'Choose your preferred trip, enter your details, and pay securely online via Paystack.',
              },
              {
                step: '03',
                title: 'Travel',
                desc: 'Arrive at the terminal with your ticket code. Board and enjoy a comfortable ride.',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-green-200" />
                )}
                <div className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center text-xl font-extrabold mb-5 shadow-lg">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green-600 text-sm font-bold uppercase tracking-widest mb-3">Testimonials</p>
            <h2 className="text-3xl font-extrabold text-gray-900">What our passengers say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Adewale M.',
                route: 'Abuja → Kano',
                text: 'Booked online in under 2 minutes. The vehicle was clean, AC was cold, and we arrived on time. Will definitely use MaidAutos again.',
              },
              {
                name: 'Chioma N.',
                route: 'Abuja → Jos',
                text: 'I travel this route often and MaidAutos is hands down the most reliable option. Professional drivers and very comfortable seats.',
              },
              {
                name: 'Olumide I.',
                route: 'Abuja → Maiduguri',
                text: 'Smooth booking process, fair price, and the driver was courteous throughout the journey. Highly recommend to anyone travelling up north.',
              },
            ].map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.route}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-green-700">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to travel?</h2>
          <p className="text-green-200 mb-8">Book your seat today and experience safe, comfortable intercity travel.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-white text-green-700 font-bold px-8 py-3.5 rounded-full hover:bg-green-50 transition-colors flex items-center gap-2 mx-auto"
          >
            <Search className="w-4 h-4" />
            Book a Trip
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 px-8 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 text-white mb-3">
              <Bus className="w-5 h-5" />
              <span className="font-bold text-lg">MaidAutos</span>
            </div>
            <p className="text-sm leading-relaxed">
              Nigeria's trusted intercity bus service connecting Abuja to the North-East and beyond. Safe, comfortable, on time.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#why-us" className="hover:text-white transition-colors">Why Choose Us</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-white transition-colors">Create Account</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign In</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><span>help@maidautos.com</span></li>
              <li><span>+234 800 000 0000</span></li>
              <li>
                <div className="flex items-center gap-1 text-green-500 mt-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="text-xs">Paystack Secured</span>
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Our Fleet</h4>
            <div className="bg-white/5 p-4 rounded-lg">
              <div
                className="w-full h-24 rounded-md mb-2 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' }}
              >
                <Bus className="w-8 h-8 text-white/70" />
              </div>
              <p className="text-[10px] text-center opacity-60">Modern executive coaches with WiFi &amp; AC</p>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto border-t border-gray-800 mt-10 pt-6 text-center text-xs">
          © {new Date().getFullYear()} MaidAutos. All rights reserved.
        </div>
      </footer>

    </div>
  )
}
