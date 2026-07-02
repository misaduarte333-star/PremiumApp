/**
 * ============================================================================
 * SonorusApp - Plantilla de Micrositio Público de Clientes
 * ============================================================================
 * 
 * Este archivo contiene el componente React completo para desplegar la página
 * pública de clientes en un proyecto Next.js independiente.
 * 
 * Requisitos:
 * 1. Instalar dependencias: npm install lucide-react framer-motion @supabase/supabase-js
 * 2. Adaptar la importación del cliente de Supabase (createClient) y funciones
 *    de utilería (cn, getHermosilloDateStr, getHermosilloMins) según tu estructura.
 * 3. Asegurar que las variables de entorno de Supabase estén configuradas.
 * 
 * Para más información, consulta el archivo public-microsite-guide.md.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { cn, getHermosilloDateStr, getHermosilloMins } from '@/lib/utils'
import { 
    Calendar, 
    Scissors, 
    Star, 
    Image as ImageIcon, 
    MessageSquare, 
    MapPin, 
    Phone, 
    Clock, 
    ChevronRight, 
    User, 
    Sparkles, 
    Check, 
    ExternalLink, 
    Menu, 
    X,
    ThumbsUp,
    MessageCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/* ─── Static haircut recommendations data ─── */
const RECOMENDACIONES_CORTES = [
    {
        id: 'textured-fade',
        nombre: 'Textured Fade',
        descripcion: 'Estilo moderno y limpio. Corto degradado en los lados con volumen texturizado arriba, ideal para peinar con cera mate.',
        rostro: 'Ovalado, Redondo',
        mantenimiento: 'Medio (cada 2-3 semanas)',
        imagen: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
        id: 'classic-pompadour',
        nombre: 'Classic Pompadour',
        descripcion: 'Corte clásico lleno de volumen, peinado hacia atrás con elegancia. Aporta una excelente presencia y altura visual.',
        rostro: 'Cuadrado, Rectangular',
        mantenimiento: 'Alto (peinado diario con pomada)',
        imagen: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
        id: 'modern-taper',
        nombre: 'Modern Taper',
        descripcion: 'Degradado discreto que se limita únicamente a las patillas y la nuca, manteniendo volumen natural en los laterales.',
        rostro: 'Todos los rostros',
        mantenimiento: 'Bajo (crecimiento muy natural)',
        imagen: 'https://images.unsplash.com/photo-1605497746444-ac9dbd324ce8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
        id: 'french-crop',
        nombre: 'French Crop',
        descripcion: 'Flequillo corto y recto con textura desordenada arriba. Un estilo urbano, fresco y sumamente fácil de mantener.',
        rostro: 'Alargado, Diamante',
        mantenimiento: 'Muy Bajo (ideal para el día a día)',
        imagen: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    }
]

/* ─── Static Google reviews data ─── */
const RESENAS_GOOGLE = [
    {
        id: 1,
        autor: 'Carlos Mendoza',
        iniciales: 'CM',
        calificacion: 5,
        tiempo: 'Hace 3 días',
        texto: 'Excelente servicio. El ambiente es muy premium y la precisión con la navaja es insuperable. El color del local y la música crean una experiencia de primera.'
    },
    {
        id: 2,
        autor: 'Sofía Valenzuela',
        iniciales: 'SV',
        calificacion: 5,
        tiempo: 'Hace 1 semana',
        texto: 'El trato es increíble. Me encanta que tengan la agenda en tiempo real, pude ver qué barberos estaban libres y mandé mensaje directo por WhatsApp para apartar.'
    },
    {
        id: 3,
        autor: 'Mateo Ruiz',
        iniciales: 'MR',
        calificacion: 5,
        tiempo: 'Hace 2 semanas',
        texto: 'La mejor opción de la ciudad. El fade texturizado me quedó perfecto y te ofrecen una bebida de cortesía mientras esperas. Súper profesionales.'
    },
    {
        id: 4,
        autor: 'Javier Gómez',
        iniciales: 'JG',
        calificacion: 5,
        tiempo: 'Hace 3 semanas',
        texto: 'Muy recomendado. Me llamó la atención ver su galería de fotos reales de cortes en su sitio web. Elegí uno, lo pedí y me lo dejaron idéntico.'
    }
]

/* ─── Fixed hourly slots for availability calculations ─── */
const HOURLY_SLOTS = [
    { time: '09:00', label: '9:00 AM', mins: 540 },
    { time: '10:00', label: '10:00 AM', mins: 600 },
    { time: '11:00', label: '11:00 AM', mins: 660 },
    { time: '12:00', label: '12:00 PM', mins: 720 },
    { time: '13:00', label: '01:00 PM', mins: 780 },
    { time: '14:00', label: '02:00 PM', mins: 840 },
    { time: '15:00', label: '03:00 PM', mins: 900 },
    { time: '16:00', label: '04:00 PM', mins: 960 },
    { time: '17:00', label: '05:00 PM', mins: 1020 },
    { time: '18:00', label: '06:00 PM', mins: 1080 },
    { time: '19:00', label: '07:00 PM', mins: 1140 }
]

export default function PublicSite() {
    const supabase = createClient()
    const [sucursales, setSucursales] = useState<any[]>([])
    const [selectedSucursalId, setSelectedSucursalId] = useState<string>('')
    const [barberos, setBarberos] = useState<any[]>([])
    const [servicios, setServicios] = useState<any[]>([])
    const [citasHoy, setCitasHoy] = useState<any[]>([])
    const [fotosCortes, setFotosCortes] = useState<any[]>([])
    
    const [loading, setLoading] = useState(true)
    const [activeTabGallery, setActiveTabGallery] = useState<string>('todos')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [currentTime, setCurrentTime] = useState<Date>(new Date())

    // Fetch initial active sucursales
    useEffect(() => {
        async function fetchInitialData() {
            setLoading(true)
            try {
                const { data: sucs, error } = await supabase
                    .from('sucursales')
                    .select('*')
                    .eq('activa', true)
                
                if (sucs && sucs.length > 0) {
                    setSucursales(sucs)
                    setSelectedSucursalId((sucs as any)[0].id)
                }
            } catch (err) {
                console.error('[PublicSite] Error loading sucursales:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchInitialData()

        // Keep local time clock updated
        const clock = setInterval(() => setCurrentTime(new Date()), 30_000)
        return () => clearInterval(clock)
    }, [])

    // Fetch data for selected sucursal
    useEffect(() => {
        if (!selectedSucursalId) return

        async function fetchSucursalData() {
            try {
                const todayStr = getHermosilloDateStr()
                const startStr = `${todayStr}T00:00:00-07:00`
                const endStr = `${todayStr}T23:59:59-07:00`

                const [barbsRes, servsRes, citasRes, fotosRes] = await Promise.all([
                    supabase.from('barberos').select('*').eq('sucursal_id', selectedSucursalId).eq('activo', true).order('estacion_id'),
                    supabase.from('servicios').select('*').eq('activo', true),
                    supabase.from('vista_citas_app').select('*').eq('sucursal_id', selectedSucursalId).gte('timestamp_inicio_local', startStr).lte('timestamp_inicio_local', endStr),
                    supabase.from('fotos_cortes').select('*')
                ])

                const activeBarbers = (barbsRes.data || []) as any[]
                const activeServices = (servsRes.data || []) as any[]
                const activeCitas = (citasRes.data || []) as any[]
                const rawPhotos = (fotosRes.data || []) as any[]

                setBarberos(activeBarbers)
                setServicios(activeServices)
                setCitasHoy(activeCitas)

                // Map cut photos with service names and barber names in JS
                const mappedPhotos = rawPhotos.map((photo: any) => {
                    const barber = activeBarbers.find(b => b.id === photo.barbero_id)
                    const service = activeServices.find(s => s.id === photo.servicio_id)
                    return {
                        ...photo,
                        barberoNombre: barber ? barber.nombre : 'Profesional',
                        servicioNombre: service ? service.nombre : 'Corte de Estilo',
                        servicioPrecio: service ? service.precio : null
                    }
                }).filter(photo => activeBarbers.some(b => b.id === photo.barbero_id)) // Only show photos from barbers of this sucursal

                setFotosCortes(mappedPhotos)
            } catch (err) {
                console.error('[PublicSite] Error loading sucursal details:', err)
            }
        }

        fetchSucursalData()

        // Set up real-time listener for appointments & gallery
        const channel = supabase
            .channel('public-site-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => fetchSucursalData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fotos_cortes' }, () => fetchSucursalData())
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedSucursalId])

    // Get selected sucursal object
    const selectedSucursal = useMemo(() => {
        return sucursales.find(s => s.id === selectedSucursalId)
    }, [sucursales, selectedSucursalId])

    // Compute availability timeline for today per barber
    const barberSlotsData = useMemo(() => {
        const currentMins = getHermosilloMins(currentTime)
        const todayStr = getHermosilloDateStr()
        
        return barberos.map(barber => {
            // Find appointments for this barber
            const appointments = citasHoy.filter(c => 
                c.barbero_id === barber.id && 
                ['pendiente', 'confirmada', 'en_proceso', 'por_cobrar', 'finalizada'].includes(c.estado)
            )

            // Map slots availability
            const slots = HOURLY_SLOTS.map(slot => {
                // 1. Check if the slot is in the past
                const isPast = slot.mins < currentMins

                // 2. Check if there is an appointment overlapping this slot
                const isBooked = appointments.some(appt => {
                    // Extract HH:mm from timestamps
                    const apptStartPart = appt.timestamp_inicio_local?.includes('T') 
                        ? appt.timestamp_inicio_local.split('T')[1] 
                        : appt.timestamp_inicio_local?.split(' ')[1]
                    
                    const apptEndPart = appt.timestamp_fin_local?.includes('T') 
                        ? appt.timestamp_fin_local.split('T')[1] 
                        : appt.timestamp_fin_local?.split(' ')[1]
                    
                    if (!apptStartPart || !apptEndPart) return false

                    const [startH, startM] = apptStartPart.split(':').map(Number)
                    const [endH, endM] = apptEndPart.split(':').map(Number)
                    const startMins = startH * 60 + startM
                    const endMins = endH * 60 + endM

                    // Match if slot fits inside appointment block
                    return slot.mins >= startMins && slot.mins < endMins
                })

                // Determine slot state
                let state: 'disponible' | 'ocupado' | 'pasado' = 'disponible'
                if (isPast) state = 'pasado'
                else if (isBooked) state = 'ocupado'

                return {
                    ...slot,
                    state
                }
            })

            const availableCount = slots.filter(s => s.state === 'disponible').length

            return {
                ...barber,
                slots,
                availableCount
            }
        })
    }, [barberos, citasHoy, currentTime])

    // Filter cut photos
    const filteredPhotos = useMemo(() => {
        if (activeTabGallery === 'todos') return fotosCortes
        return fotosCortes.filter(photo => {
            const servName = photo.servicioNombre.toLowerCase()
            if (activeTabGallery === 'cortes') return servName.includes('corte')
            if (activeTabGallery === 'barba') return servName.includes('barba')
            if (activeTabGallery === 'combos') return servName.includes('combo') || servName.includes('paquete')
            return true
        })
    }, [fotosCortes, activeTabGallery])

    // Generate WhatsApp booking link
    const getWhatsAppLink = (barberName?: string, time?: string) => {
        if (!selectedSucursal) return 'https://wa.me/'
        const rawPhone = selectedSucursal.telefono_whatsapp || ''
        const cleanPhone = rawPhone.replace(/\D/g, '')
        
        let text = 'Hola! Me gustaría agendar una cita en ' + selectedSucursal.nombre
        if (barberName && time) {
            text += ` hoy con ${barberName} a las ${time}.`
        } else if (barberName) {
            text += ` hoy con ${barberName}.`
        } else {
            text += ' hoy.'
        }
        
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070412] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
                        <div className="absolute inset-3 rounded-full bg-primary/5 flex items-center justify-center">
                            <Scissors className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Cargando experiencia...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#070412] text-[#FAF9FF] font-sans selection:bg-primary selection:text-black antialiased overflow-x-hidden">
            
            {/* Ambient gradients */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[500px] bg-radial-gradient(circle at top center, rgba(109,40,217,0.12) 0%, transparent 70%) pointer-events-none z-0" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-radial-gradient(circle at bottom right, rgba(109,40,217,0.06) 0%, transparent 60%) pointer-events-none z-0" />

            {/* ─── NAVIGATION BAR ─── */}
            <header className="sticky top-0 bg-[#070412]/80 backdrop-blur-xl border-b border-border/40 z-50 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    
                    {/* Brand/Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-black/60 flex items-center justify-center border border-primary/30 p-1.5 shadow-[0_0_15px_rgba(109,40,217,0.25)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/sonorus-logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-black text-sm uppercase tracking-[0.2em] font-display">
                            {selectedSucursal ? selectedSucursal.nombre : 'SonorusApp'}
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <nav className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        <a href="#agenda" className="hover:text-primary transition-colors">Disponibilidad</a>
                        <a href="#cortes" className="hover:text-primary transition-colors">Recomendaciones</a>
                        <a href="#galeria" className="hover:text-primary transition-colors">Galería</a>
                        <a href="#resenas" className="hover:text-primary transition-colors">Reseñas</a>
                    </nav>

                    {/* Action button */}
                    <div className="hidden md:block">
                        <a 
                            id="btn-nav-book"
                            href={getWhatsAppLink()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ size: 'sm' }), "btn-primary h-9 text-[10px] tracking-wider uppercase rounded-xl")}
                        >
                            Agendar por WhatsApp
                            <ExternalLink className="w-3 h-3 ml-1.5 shrink-0" />
                        </a>
                    </div>

                    {/* Mobile menu toggle */}
                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Abrir menú"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                </div>
            </header>

            {/* Mobile Dropdown Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-b border-border/40 bg-[#070412]/95 backdrop-blur-xl relative z-40"
                    >
                        <nav className="flex flex-col p-4 gap-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
                            <a href="#agenda" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-primary border-b border-border/10">Disponibilidad</a>
                            <a href="#cortes" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-primary border-b border-border/10">Recomendaciones</a>
                            <a href="#galeria" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-primary border-b border-border/10">Galería</a>
                            <a href="#resenas" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-primary mb-2">Reseñas</a>
                            <a 
                                href={getWhatsAppLink()} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={cn(buttonVariants(), "btn-primary w-full h-11 text-[10px] tracking-wider uppercase rounded-xl flex items-center justify-center gap-2")}
                            >
                                <MessageCircle className="w-4 h-4" />
                                Reservar Cita Hoy
                            </a>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── HERO SECTION ─── */}
            <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 max-w-7xl mx-auto z-10 text-center">
                <div className="max-w-3xl mx-auto space-y-6">
                    
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Consultas en Tiempo Real</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight uppercase font-display">
                        Estilo y Precisión en <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-primary">Tiempo Real</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xs sm:text-base text-muted-foreground leading-relaxed font-sans max-w-xl mx-auto">
                        Consulta la disponibilidad de nuestros barberos profesionales en vivo, explora sus mejores cortes reales y reserva tu espacio de forma inmediata.
                    </p>

                    {/* Sucursal Selector Wrapper */}
                    {sucursales.length > 1 && (
                        <div className="pt-4 flex flex-col items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Selecciona tu sucursal</span>
                            <div className="relative inline-block w-64">
                                <select 
                                    value={selectedSucursalId} 
                                    onChange={(e) => setSelectedSucursalId(e.target.value)}
                                    className="w-full bg-card/60 backdrop-blur-md border border-border/60 hover:border-primary/50 text-foreground px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] outline-none transition-all cursor-pointer appearance-none text-center"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                </div>
            </section>

            {/* ─── REAL-TIME AGENDA WIDGET ─── */}
            <section id="agenda" className="py-16 border-t border-border/30 px-4 max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-10 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase font-display tracking-tight">Agenda Hoy en Vivo</h2>
                    <p className="text-xs text-muted-foreground">Disponibilidad en tiempo real para el día de hoy. Haz clic en una hora libre para apartar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {barberSlotsData.length === 0 ? (
                        <div className="col-span-2 py-16 text-center bg-card rounded-[2rem] border border-border/40">
                            <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground font-black uppercase tracking-wider text-xs">Sin barberos activos hoy</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Por favor selecciona otra sucursal o intenta más tarde.</p>
                        </div>
                    ) : (
                        barberSlotsData.map(barber => (
                            <Card key={barber.id} className="glass-card bg-[#0D0724]/40 border-border/60 overflow-hidden hover:border-primary/30 group">
                                <CardContent className="p-6 space-y-5">
                                    
                                    {/* Barber details */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-base shadow-lg shadow-primary/5 group-hover:scale-105 transition-transform duration-300">
                                                {barber.nombre.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-sm uppercase tracking-wide text-foreground">{barber.nombre}</h3>
                                                <p className="text-[10px] text-muted-foreground">Estación #{barber.estacion_id || '0'}</p>
                                            </div>
                                        </div>
                                        <Badge 
                                            variant="outline" 
                                            className={cn(
                                                "px-2.5 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest",
                                                barber.availableCount > 0 
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                            )}
                                        >
                                            {barber.availableCount > 0 ? `${barber.availableCount} Horas Libres` : 'Lleno Hoy'}
                                        </Badge>
                                    </div>

                                    {/* Slots header */}
                                    <div className="flex items-center justify-between border-t border-border/20 pt-4">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Horarios de hoy:</span>
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-muted-foreground">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Libre</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Ocupado</div>
                                        </div>
                                    </div>

                                    {/* Slots grid */}
                                    <div className="grid grid-cols-3 xs:grid-cols-4 gap-2">
                                        {barber.slots.map((slot: any) => {
                                            const isDisponible = slot.state === 'disponible'
                                            return (
                                                <a
                                                    key={slot.time}
                                                    href={isDisponible ? getWhatsAppLink(barber.nombre.split(' ')[0], slot.label) : '#agenda'}
                                                    target={isDisponible ? '_blank' : undefined}
                                                    rel={isDisponible ? 'noopener noreferrer' : undefined}
                                                    className={cn(
                                                        "py-2 px-1 text-center rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all select-none",
                                                        slot.state === 'disponible' && "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)] hover:-translate-y-0.5 active:scale-95 cursor-pointer",
                                                        slot.state === 'ocupado' && "bg-[#161033] border-[#161033] text-muted-foreground/30 pointer-events-none line-through",
                                                        slot.state === 'pasado' && "bg-transparent border-border/10 text-muted-foreground/20 pointer-events-none"
                                                    )}
                                                >
                                                    {slot.label}
                                                </a>
                                            )
                                        })}
                                    </div>

                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </section>

            {/* ─── HAIR CUT RECOMMENDATIONS ─── */}
            <section id="cortes" className="py-16 border-t border-border/30 px-4 max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-12 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase font-display tracking-tight">Recomendaciones de Cortes</h2>
                    <p className="text-xs text-muted-foreground">Encuentra el estilo que mejor se adapta a tus rasgos faciales y tipo de cabello.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {RECOMENDACIONES_CORTES.map(corte => (
                        <Card key={corte.id} className="glass-card bg-[#0D0724]/40 border-border/60 overflow-hidden hover:border-primary/40 group flex flex-col">
                            {/* Image container */}
                            <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border/40 shrink-0">
                                <div className="absolute inset-0 bg-[#070412]/20 z-10" />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                    src={corte.imagen} 
                                    alt={corte.nombre} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <Badge className="absolute top-3 right-3 bg-primary text-black font-black uppercase text-[8px] tracking-widest z-20">
                                    Trending
                                </Badge>
                            </div>

                            {/* Details */}
                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                                <div className="space-y-2">
                                    <h3 className="font-black text-base uppercase tracking-wide text-foreground font-display leading-tight">{corte.nombre}</h3>
                                    <p className="text-[11px] text-muted-foreground leading-normal line-clamp-3">{corte.descripcion}</p>
                                </div>

                                <div className="space-y-1.5 pt-3 border-t border-border/20 text-[9px] uppercase font-black text-muted-foreground">
                                    <div className="flex items-center justify-between">
                                        <span>Rostro Ideal:</span>
                                        <span className="text-primary tracking-wide text-right">{corte.rostro}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Mantenimiento:</span>
                                        <span className="text-foreground tracking-wide text-right">{corte.mantenimiento}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ─── LIVE GALLERY SECTION ─── */}
            <section id="galeria" className="py-16 border-t border-border/30 px-4 max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-10 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase font-display tracking-tight">Galería de Cortes en Vivo</h2>
                    <p className="text-xs text-muted-foreground">Fotos reales de trabajos realizados hoy y subidas al instante por nuestros barberos.</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex justify-center gap-1.5 sm:gap-3 mb-8 overflow-x-auto no-scrollbar py-2">
                    {['todos', 'cortes', 'barba', 'combos'].map(tab => (
                        <Button
                            key={tab}
                            onClick={() => setActiveTabGallery(tab)}
                            className={cn(
                                "h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap shadow-none border",
                                activeTabGallery === tab 
                                    ? "bg-primary/20 text-primary border-primary/30" 
                                    : "bg-card/40 text-muted-foreground border-border hover:bg-card/60"
                            )}
                        >
                            {tab}
                        </Button>
                    ))}
                </div>

                {/* Gallery Grid */}
                {filteredPhotos.length === 0 ? (
                    <div className="py-16 text-center bg-card rounded-[2rem] border border-border/40 max-w-2xl mx-auto space-y-4">
                        <div className="w-12 h-12 bg-muted/60 border border-border/40 flex items-center justify-center rounded-2xl mx-auto text-muted-foreground/30">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-muted-foreground font-black uppercase tracking-wider text-xs">Aún no hay fotos en esta categoría</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-sm mx-auto">
                            Las fotos aparecerán aquí automáticamente en tiempo real en cuanto los barberos suban sus cortes desde la tableta.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {filteredPhotos.map((photo: any, index: number) => (
                            <Card key={photo.id || index} className="glass-card bg-[#0D0724]/40 border-border/60 overflow-hidden hover:border-primary/40 group flex flex-col">
                                <div className="relative aspect-square w-full overflow-hidden border-b border-border/40 shrink-0">
                                    <div className="absolute inset-0 bg-[#070412]/30 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <a 
                                            href={photo.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className={cn(buttonVariants({ size: 'icon' }), "w-10 h-10 rounded-full bg-primary text-black hover:bg-primary/90 shadow-xl")}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={photo.url} 
                                        alt={photo.servicioNombre} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                    />
                                </div>
                                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
                                    <div>
                                        <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{photo.servicioNombre}</p>
                                        <h4 className="font-bold text-sm text-foreground truncate mt-0.5">{photo.servicioNombre}</h4>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-border/20 pt-2.5 text-[9px] uppercase font-black text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-muted-foreground/60" /> {photo.barberoNombre}</span>
                                        {photo.servicioPrecio && <span className="text-foreground font-display tracking-tight">${photo.servicioPrecio}</span>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* ─── GOOGLE REVIEWS SECTION ─── */}
            <section id="resenas" className="py-16 border-t border-border/30 px-4 max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-10 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black uppercase font-display tracking-tight">Opinión de Clientes</h2>
                    <p className="text-xs text-muted-foreground">Reseñas de Google Maps validadas y certificadas por clientes reales del negocio.</p>
                </div>

                {/* Score Summary */}
                <div className="bg-card/40 border border-border/60 rounded-[2rem] p-6 max-w-xl mx-auto mb-10 flex flex-col sm:flex-row items-center justify-around gap-6 text-center sm:text-left">
                    <div className="space-y-1">
                        <div className="flex items-baseline justify-center sm:justify-start gap-1">
                            <span className="text-5xl font-black font-display tracking-tight">4.9</span>
                            <span className="text-lg text-muted-foreground">/5</span>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-1 text-primary">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-current" />
                            ))}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Calificación promedio Google Reviews</p>
                    </div>

                    <div className="h-px w-full sm:h-12 sm:w-px bg-border/40" />

                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-bold leading-none">Sonorus Premium Experience</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Google Maps Business Rating</p>
                        </div>
                        <a 
                            id="btn-google-rate"
                            href={getWhatsAppLink()} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "h-8 text-[9px] font-black uppercase tracking-widest rounded-lg gap-2 bg-transparent text-primary hover:bg-primary/10 border-primary/20 hover:border-primary/40")}
                        >
                            Escribir Reseña
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>

                {/* Grid of Reviews */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    {RESENAS_GOOGLE.map(resena => (
                        <Card key={resena.id} className="glass-card bg-[#0D0724]/40 border-border/60 p-5 space-y-4 hover:border-primary/20 transition-all duration-300">
                            {/* Author */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs border border-primary/25">
                                        {resena.iniciales}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-xs text-foreground uppercase tracking-wide leading-none">{resena.autor}</h4>
                                        <p className="text-[9px] text-muted-foreground mt-1 leading-none">{resena.tiempo}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5 text-primary">
                                    {Array.from({ length: resena.calificacion }).map((_, i) => (
                                        <Star key={i} className="w-3 h-3 fill-current" />
                                    ))}
                                </div>
                            </div>

                            {/* Text */}
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                "{resena.texto}"
                            </p>

                            {/* Verified check */}
                            <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                                <Check className="w-3 h-3 text-emerald-400" />
                                Cliente Verificado
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="py-12 border-t border-border/30 bg-[#060411]/90 relative z-10 px-4">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    
                    {/* Brand column */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-primary/30 p-1.5 shadow-[0_0_12px_rgba(109,40,217,0.2)]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/sonorus-logo.png" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="font-black text-xs uppercase tracking-[0.2em] font-display">
                                {selectedSucursal ? selectedSucursal.nombre : 'SonorusApp'}
                            </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground max-w-xs mx-auto md:mx-0 leading-relaxed">
                            Buscamos la perfección en cada corte. Consulta nuestra agenda en tiempo real y reserva tu espacio con profesionales.
                        </p>
                    </div>

                    {/* Contact column */}
                    <div className="space-y-3.5 text-[10px] uppercase font-black text-muted-foreground">
                        <p className="text-foreground tracking-wider mb-2 font-display text-xs">Contacto y Ubicación</p>
                        {selectedSucursal ? (
                            <>
                                <div className="flex items-center justify-center md:justify-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                                    <span className="truncate max-w-[250px]">{selectedSucursal.direccion || 'Ubicación Premium'}</span>
                                </div>
                                <div className="flex items-center justify-center md:justify-start gap-2.5">
                                    <Phone className="w-4 h-4 text-primary shrink-0" />
                                    <span>{selectedSucursal.telefono_whatsapp || '—'}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-[10px]">Cargando información...</p>
                        )}
                    </div>

                    {/* Hours column */}
                    <div className="space-y-3.5 text-[10px] uppercase font-black text-muted-foreground">
                        <p className="text-foreground tracking-wider mb-2 font-display text-xs">Horarios de Atención</p>
                        <div className="flex items-center justify-center md:justify-start gap-2.5">
                            <Clock className="w-4 h-4 text-primary shrink-0" />
                            <div className="text-left leading-normal">
                                <p>Lunes a Sábado: 09:00 AM - 07:00 PM</p>
                                <p className="text-muted-foreground/50">Domingo: Cerrado</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Subfooter */}
                <div className="max-w-7xl mx-auto border-t border-border/20 mt-10 pt-6 text-center text-[9px] uppercase font-black text-muted-foreground/30">
                    <p>© 2026 {selectedSucursal ? selectedSucursal.nombre : 'SonorusApp'}. Todos los derechos reservados. Powered by SonorusApp AI.</p>
                </div>
            </footer>

        </div>
    )
}
