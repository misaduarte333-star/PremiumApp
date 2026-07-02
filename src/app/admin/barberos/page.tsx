'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useBusinessLabels } from '@/hooks/useBusinessLabels'
import type { Barbero, BarberoConSucursal, Sucursal } from '@/lib/types'
import { HorarioGanttModal } from '@/components/HorarioGanttModal'
import { 
    Users, 
    Plus, 
    Search, 
    LayoutGrid, 
    Clock, 
    Edit, 
    Trash2, 
    Calendar,
    Scissors,
    ChevronRight,
    Loader2,
    Shield,
    CheckCircle2,
    XCircle,
    Mail,
    Check,
    X,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

export default function BarberosPage() {
    const { sucursalId, loading: authLoading } = useAuth()
    const { professional } = useBusinessLabels()
    const [barberos, setBarberos] = useState<BarberoConSucursal[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showScheduleModal, setShowScheduleModal] = useState(false)
    const [showGanttModal, setShowGanttModal] = useState(false)
    const [editingBarbero, setEditingBarbero] = useState<Barbero | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [sucursalData, setSucursalData] = useState<Sucursal | null>(null)

    const [currentTime, setCurrentTime] = useState(new Date())

    // Attendance and Tab states
    const [activeTab, setActiveTab] = useState<'staff' | 'asistencia'>('staff')
    const [attendanceList, setAttendanceList] = useState<any[]>([])
    const [loadingAttendance, setLoadingAttendance] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const cargarBarberos = useCallback(async () => {
        if (!sucursalId) return
        try {
            const { data, error } = await (supabase
                .from('barberos') as any)
                .select('*, sucursal:sucursales(*)')
                .eq('sucursal_id', sucursalId)
                .order('estacion_id', { ascending: true })

            if (error) {
                console.error('Error loading barbers:', error)
                setBarberos(getDemoBarbers())
            } else {
                setBarberos(data || [])
                if (data && data.length > 0 && data[0].sucursal) {
                    setSucursalData(data[0].sucursal)
                }
            }
        } catch (err) {
            console.error('Supabase not configured:', err)
            setBarberos(getDemoBarbers())
        } finally {
            setLoading(false)
        }
    }, [supabase, sucursalId])

    const cargarAsistencia = useCallback(async () => {
        if (!sucursalId) return
        setLoadingAttendance(true)
        try {
            const todayStr = new Date().toLocaleDateString('en-CA')
            
            // 1. Fetch active barbers
            const { data: barbs, error: bErr } = await supabase
                .from('barberos')
                .select('*')
                .eq('sucursal_id', sucursalId)
                .eq('activo', true)
                .order('estacion_id')

            if (bErr) throw bErr

            // 2. Fetch today's attendance logs
            const { data: logs, error: lErr } = await (supabase as any)
                .from('registro_asistencia')
                .select('*')
                .eq('sucursal_id', sucursalId)
                .eq('fecha', todayStr)

            if (lErr) throw lErr

            const merged = (barbs || []).map((b: any) => {
                const log = (logs || []).find((l: any) => l.barbero_id === b.id)
                return {
                    ...b,
                    asistencia: log || null
                }
            })
            setAttendanceList(merged)
        } catch (err) {
            console.error('Error loading attendance logs:', err)
            // Fallback for demo
            setAttendanceList(getDemoAttendance())
        } finally {
            setLoadingAttendance(false)
        }
    }, [supabase, sucursalId])

    const handleManualCheckIn = async (barbero: any) => {
        try {
            const todayStr = new Date().toLocaleDateString('en-CA')
            const now = new Date()
            const nowIso = now.toISOString()
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
            const todayDayName = diasSemana[now.getDay()]
            const schedule = barbero.horario_laboral?.[todayDayName]
            let estado = 'a_tiempo'
            
            if (schedule) {
                const [schHour, schMin] = schedule.inicio.split(':').map(Number)
                const scheduledTime = new Date(now)
                scheduledTime.setHours(schHour, schMin, 0, 0)
                if (now > scheduledTime) {
                    estado = 'tarde'
                }
            }

            const { error } = await (supabase as any)
                .from('registro_asistencia')
                .insert([{
                    barbero_id: barbero.id,
                    sucursal_id: sucursalId,
                    fecha: todayStr,
                    hora_entrada: nowIso,
                    estado: estado,
                    observaciones: 'Registrado por Encargado'
                }])

            if (error) throw error
            toast.success('Entrada registrada correctamente')
            cargarAsistencia()
        } catch (err: any) {
            console.error('Error in manual check-in:', err)
            toast.error('Error al registrar entrada: ' + err.message)
            
            // Demo mode fallback
            setAttendanceList(prev => prev.map(item => {
                if (item.id === barbero.id) {
                    return {
                        ...item,
                        asistencia: {
                            id: 'demo-' + Math.random(),
                            fecha: new Date().toLocaleDateString('en-CA'),
                            hora_entrada: new Date().toISOString(),
                            hora_salida: null,
                            estado: 'a_tiempo',
                            observaciones: 'Registrado por Encargado (Demo)'
                        }
                    }
                }
                return item
            }))
        }
    }

    const handleManualCheckOut = async (barbero: any) => {
        if (!barbero.asistencia?.id) return
        try {
            const { error } = await (supabase as any)
                .from('registro_asistencia')
                .update({
                    hora_salida: new Date().toISOString()
                })
                .eq('id', barbero.asistencia.id)

            if (error) throw error
            toast.success('Salida registrada correctamente')
            cargarAsistencia()
        } catch (err: any) {
            console.error('Error in manual check-out:', err)
            toast.error('Error al registrar salida: ' + err.message)

            // Demo mode fallback
            setAttendanceList(prev => prev.map(item => {
                if (item.id === barbero.id && item.asistencia) {
                    return {
                        ...item,
                        asistencia: {
                            ...item.asistencia,
                            hora_salida: new Date().toISOString()
                        }
                    }
                }
                return item
            }))
        }
    }

    useEffect(() => {
        if (authLoading || !sucursalId) return
        if (activeTab === 'asistencia') {
            cargarAsistencia()
        } else {
            cargarBarberos()
        }
    }, [activeTab, cargarBarberos, cargarAsistencia, sucursalId, authLoading])

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este profesional?')) return

        try {
            const { error } = await supabase
                .from('barberos')
                .delete()
                .eq('id', id)

            if (error) {
                toast.error('Error al eliminar profesional')
            } else {
                toast.success('Profesional eliminado correctamente')
                cargarBarberos()
            }
        } catch {
            setBarberos(barberos.filter(b => b.id !== id))
            toast.success('Profesional eliminado (modo demo)')
        }
    }

    const handleEdit = (barbero: Barbero) => {
        setEditingBarbero(barbero)
        setShowModal(true)
    }

    const handleNew = () => {
        setEditingBarbero(null)
        setShowModal(true)
    }

    const filteredBarberos = barberos.filter(b =>
        b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.usuario_tablet.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-black transition-colors duration-300">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border mb-4 font-display">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.15)]">
                            <Users className="w-7 h-7 text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground leading-none font-display">
                                Staff <span className="text-gradient-gold italic">{professional}s</span>
                            </h1>
                            <p className="text-muted-foreground mt-1 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70">
                                Gestión de equipo y disponibilidad
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Clock & Date */}
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-foreground font-black text-xl tracking-tighter leading-none uppercase">
                                {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                            <span className="text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                                {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                        </div>

                        <Button 
                            onClick={handleNew}
                            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-md shadow-primary/10 h-11 px-6 rounded-xl transition-all"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Nuevo {professional}
                        </Button>
                    </div>
                </header>

                {/* Tabs Selector */}
                <div className="flex items-center gap-6 border-b border-border/40 pb-1 font-display">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] pb-3 px-1 border-b-2 transition-all relative",
                            activeTab === 'staff' 
                                ? "border-primary text-primary" 
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Gestión de Staff
                    </button>
                    <button
                        onClick={() => setActiveTab('asistencia')}
                        className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] pb-3 px-1 border-b-2 transition-all relative",
                            activeTab === 'asistencia' 
                                ? "border-primary text-primary" 
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Control de Asistencia
                    </button>
                </div>

                {activeTab === 'staff' ? (
                    <>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                onClick={() => setShowGanttModal(true)}
                                className="flex-1 sm:flex-none bg-muted border-border hover:bg-muted/80 text-muted-foreground font-bold text-[10px] uppercase tracking-widest h-9"
                            >
                                <LayoutGrid className="w-3 h-3 mr-2 text-primary" />
                                Diagrama
                            </Button>
                            <Button 
                                onClick={handleNew}
                                className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-9 shadow-md shadow-primary/10 rounded-xl transition-all"
                            >
                                <Plus className="w-3 h-3 mr-2" />
                                Nuevo {professional}
                            </Button>
                        </div>

                        <HorarioGanttModal
                            isOpen={showGanttModal}
                            onClose={() => setShowGanttModal(false)}
                            profesionales={barberos}
                            sucursal={sucursalData}
                        />

                        {/* Search & Filters */}
                        <Card className="glass-card border-border mb-6">
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="w-full flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por nombre o usuario..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                                        <Users className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-muted-foreground text-xs font-bold">{filteredBarberos.length} {professional.toUpperCase()}S</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Table */}
                        <Card className="glass-card border-border overflow-hidden">
                            {loading ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    <p className="text-muted-foreground text-sm animate-pulse">Cargando equipo...</p>
                                </div>
                            ) : filteredBarberos.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                                        <Users className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-muted-foreground font-medium">No se encontraron registros de {professional.toLowerCase()}s</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow className="border-border hover:bg-transparent">
                                                <TableHead className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold h-12">Estación</TableHead>
                                                <TableHead className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold h-12">{professional}</TableHead>
                                                <TableHead className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold h-12 hidden sm:table-cell">Correo / Acceso</TableHead>
                                                <TableHead className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold h-12">Horario Laboral</TableHead>
                                                <TableHead className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold h-12">Estado</TableHead>
                                                <TableHead className="text-right text-muted-foreground text-[10px] uppercase tracking-wider font-bold h-12">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBarberos.map((barbero) => (
                                                <TableRow key={barbero.id} className="border-border hover:bg-foreground/[0.02] transition-colors group">
                                                    <TableCell>
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/30 flex items-center justify-center font-black text-primary text-sm">
                                                            {barbero.estacion_id}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-bold text-foreground shadow-inner">
                                                                {barbero.nombre.charAt(0)}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <p className="font-bold text-foreground text-sm tracking-tight">{barbero.nombre}</p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <LayoutGrid className="w-3 h-3 text-muted-foreground" />
                                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">Estación {barbero.estacion_id}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="w-3.5 h-3.5 text-primary/50" />
                                                                <span className="text-xs text-foreground font-semibold">{barbero.email || 'Sin Correo'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 pl-5">
                                                                <Shield className="w-3 h-3 text-blue-500/50" />
                                                                <code className="text-[10px] text-muted-foreground font-mono">
                                                                    {barbero.usuario_tablet}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 text-foreground">
                                                                <Clock className="w-3.5 h-3.5 text-primary/70" />
                                                                <span className="text-xs font-medium">
                                                                    {getHorarioResumen(barbero.horario_laboral)}
                                                                </span>
                                                            </div>
                                                            {barbero.bloqueo_almuerzo && (
                                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                    <span className="text-[10px]">🍽️</span>
                                                                    <span className="text-[10px] font-medium tracking-tight">
                                                                        ALMUERZO: {barbero.bloqueo_almuerzo.inicio} - {barbero.bloqueo_almuerzo.fin}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            className={cn(
                                                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border-none",
                                                                barbero.activo 
                                                                    ? "bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
                                                                    : "bg-red-500/10 text-red-400"
                                                            )}
                                                        >
                                                            {barbero.activo ? (
                                                                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Activo</span>
                                                            ) : (
                                                                <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Inactivo</span>
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1 px-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleEdit(barbero)}
                                                                className="h-8 w-8 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                                                title="Editar"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setEditingBarbero(barbero)
                                                                    setShowScheduleModal(true)
                                                                }}
                                                                className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                                                                title="Configurar Horario"
                                                            >
                                                                <Clock className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDelete(barbero.id)}
                                                                className="h-8 w-8 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </Card>
                    </>
                ) : (
                    <AsistenciaTab 
                        attendanceList={attendanceList}
                        loading={loadingAttendance}
                        onCheckIn={handleManualCheckIn}
                        onCheckOut={handleManualCheckOut}
                        professional={professional}
                    />
                )}

            {/* Modals */}
            {showModal && (
                <BarberoModal
                    barbero={editingBarbero}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false)
                        cargarBarberos()
                    }}
                />
            )}

            {showScheduleModal && editingBarbero && (
                <HorarioModal
                    barbero={editingBarbero}
                    onClose={() => setShowScheduleModal(false)}
                    onSave={() => {
                        setShowScheduleModal(false)
                        cargarBarberos()
                    }}
                />
            )}
            </div>
        </div>
    )
}

// Helper to summarize schedule
function getHorarioResumen(horario: Record<string, { inicio: string; fin: string }>) {
    if (!horario) return 'No configurado'
    const dias = Object.keys(horario).length
    const ejemplo = Object.values(horario)[0]
    if (!ejemplo) return 'No configurado'
    return `${dias} días • ${ejemplo.inicio} - ${ejemplo.fin}`
}

// Demo data
function getDemoBarbers(): BarberoConSucursal[] {
    return [
        {
            id: '1',
            sucursal_id: '1',
            nombre: 'Carlos Hernández',
            estacion_id: 1,
            usuario_tablet: 'carlos01',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '09:00', fin: '18:00' },
                martes: { inicio: '09:00', fin: '18:00' },
                miercoles: { inicio: '09:00', fin: '18:00' },
                jueves: { inicio: '09:00', fin: '18:00' },
                viernes: { inicio: '09:00', fin: '18:00' },
                sabado: { inicio: '09:00', fin: '15:00' }
            },
            bloqueo_almuerzo: { inicio: '14:00', fin: '15:00' },
            comision_porcentaje: 50,
            meta_cortes_mensual: 100,
            activo: true,
            hora_entrada: null,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            sucursal_id: '1',
            nombre: 'Miguel Ángel López',
            estacion_id: 2,
            usuario_tablet: 'miguel02',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '10:00', fin: '19:00' },
                martes: { inicio: '10:00', fin: '19:00' },
                miercoles: { inicio: '10:00', fin: '19:00' },
                jueves: { inicio: '10:00', fin: '19:00' },
                viernes: { inicio: '10:00', fin: '19:00' },
                sabado: { inicio: '10:00', fin: '16:00' }
            },
            bloqueo_almuerzo: { inicio: '14:30', fin: '15:30' },
            comision_porcentaje: 50,
            meta_cortes_mensual: 100,
            activo: true,
            hora_entrada: null,
            created_at: new Date().toISOString()
        },
        {
            id: '3',
            sucursal_id: '1',
            nombre: 'Roberto Sánchez',
            estacion_id: 3,
            usuario_tablet: 'roberto03',
            password_hash: '',
            horario_laboral: {
                lunes: { inicio: '09:00', fin: '18:00' },
                martes: { inicio: '09:00', fin: '18:00' },
                miercoles: { inicio: '09:00', fin: '18:00' },
                jueves: { inicio: '09:00', fin: '18:00' },
                viernes: { inicio: '09:00', fin: '18:00' }
            },
            bloqueo_almuerzo: null,
            activo: false,
            hora_entrada: null,
            comision_porcentaje: 50,
            meta_cortes_mensual: 100,
            created_at: new Date().toISOString()
        }
    ]
}

function BarberoModal({
    barbero,
    onClose,
    onSave
}: {
    barbero: Barbero | null
    onClose: () => void
    onSave: () => void
}) {
    const { sucursalId: contextSucursalId } = useAuth()
    const { professional } = useBusinessLabels()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre: barbero?.nombre || '',
        estacion_id: barbero?.estacion_id?.toString() || '',
        usuario_tablet: barbero?.usuario_tablet || '',
        email: (barbero as any)?.email || '',
        password: '',
        comision_porcentaje: barbero?.comision_porcentaje?.toString() || '50',
        activo: barbero?.activo ?? true
    })

    const supabase = createClient()
    const sucursalId = contextSucursalId || null


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!sucursalId && !barbero) throw new Error('No se encontró una sucursal activa')

            const data: any = {
                nombre: formData.nombre,
                estacion_id: parseInt(formData.estacion_id),
                usuario_tablet: formData.usuario_tablet,
                activo: formData.activo,
                comision_porcentaje: parseInt(formData.comision_porcentaje) || 50,
                horario_laboral: barbero?.horario_laboral || {
                    lunes: { inicio: '09:00', fin: '18:00' },
                    martes: { inicio: '09:00', fin: '18:00' },
                    miercoles: { inicio: '09:00', fin: '18:00' },
                    jueves: { inicio: '09:00', fin: '18:00' },
                    viernes: { inicio: '09:00', fin: '18:00' },
                    sabado: { inicio: '09:00', fin: '15:00' }
                },
                password_hash: barbero?.password_hash || 'pending'
            }
            // Only set email if provided (avoid duplicate key errors for existing barbers)
            if (formData.email) data.email = formData.email.toLowerCase().trim()

            let savedId = barbero?.id

            if (barbero) {
                const { error } = await (supabase.from('barberos') as any).update(data).eq('id', barbero.id)
                if (error) throw error
            } else {
                const { data: inserted, error } = await (supabase.from('barberos') as any)
                    .insert([{ ...data, sucursal_id: sucursalId }])
                    .select()
                if (error) throw error
                savedId = inserted?.[0]?.id
            }

            // Si hay una nueva contraseña, la encriptamos mediante la API
            if (formData.password && savedId) {
                const res = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: 'barberos',
                        userId: savedId,
                        newPassword: formData.password
                    })
                })
                
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(`Error en el servidor de seguridad: ${err.error}`)
                }
            }

            toast.success(barbero ? 'Profesional actualizado correctamente' : 'Profesional creado correctamente')
            onSave()
        } catch (err: any) {
            console.error('Error saving:', err)
            toast.error(err.message || 'Error al guardar profesional')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] glass-card border-border bg-card/95 text-foreground p-0 overflow-hidden rounded-[2rem]">
                <div className="bg-gradient-to-b from-primary/10 to-transparent p-6 border-b border-border">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic tracking-tighter flex items-center gap-2 text-primary">
                            <Users className="w-6 h-6" />
                            {barbero ? `EDITAR ${professional.toUpperCase()}` : `NUEVO ${professional.toUpperCase()}`}
                        </DialogTitle>
                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mt-1">
                            {barbero ? 'Modifica los perfiles del equipo' : 'Añade un nuevo experto al equipo'}
                        </p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre Completo</Label>
                            <Input
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl"
                                placeholder="Ej. Carlos Hernández"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Número de Estación</Label>
                            <Input
                                type="number"
                                value={formData.estacion_id}
                                onChange={(e) => setFormData({ ...formData, estacion_id: e.target.value })}
                                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl"
                                placeholder="1-20"
                                required
                            />
                        </div>
                    </div>

                    {/* Email field for unified login */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Correo Electrónico (Login Unificado)</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl"
                                placeholder="correo@ejemplo.com"
                            />
                        </div>
                        <p className="text-[9px] text-muted-foreground/50 pl-1">Permite al profesional iniciar sesión con su correo desde la app</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Usuario Tablet</Label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    value={formData.usuario_tablet}
                                    onChange={(e) => setFormData({ ...formData, usuario_tablet: e.target.value })}
                                    className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl"
                                    placeholder="carlos01"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contraseña Access</Label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 rounded-xl"
                                placeholder="••••••••"
                                required={!barbero}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-primary">Configuración de Ventas</Label>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="activo"
                                    checked={formData.activo}
                                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                                    className="data-[state=checked]:bg-primary"
                                />
                                <Label htmlFor="activo" className="text-[10px] font-bold uppercase text-muted-foreground">Activo</Label>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Input
                                    type="number"
                                    value={formData.comision_porcentaje}
                                    onChange={(e) => setFormData({ ...formData, comision_porcentaje: e.target.value })}
                                    className="bg-card border-border text-foreground pr-8 focus:border-primary/50 font-bold"
                                    required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                Porcentaje de comisión asignado por cada servicio realizado.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted font-bold uppercase tracking-widest text-[10px]"
                        >
                            CANCELAR
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] px-8 hover:opacity-90 disabled:opacity-50 rounded-xl transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : barbero ? (
                                'GUARDAR CAMBIOS'
                            ) : (
                                `CREAR ${professional.toUpperCase()}`
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function HorarioModal({
    barbero,
    onClose,
    onSave
}: {
    barbero: Barbero
    onClose: () => void
    onSave: () => void
}) {
    const defaultSchedule = { inicio: '09:00', fin: '18:00' }
    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

    const [loading, setLoading] = useState(false)
    const [horario, setHorario] = useState<Record<string, { inicio: string, fin: string } | null>>(() => {
        const initial: any = {}
        diasSemana.forEach(dia => {
            // @ts-ignore
            initial[dia] = barbero.horario_laboral?.[dia] || null
        })
        return initial
    })

    const [almuerzo, setAlmuerzo] = useState({
        inicio: barbero.bloqueo_almuerzo?.inicio || '14:00',
        fin: barbero.bloqueo_almuerzo?.fin || '15:00',
        activo: !!barbero.bloqueo_almuerzo
    })

    const supabase = createClient()

    const handleDayToggle = (dia: string, active: boolean) => {
        setHorario(prev => ({
            ...prev,
            [dia]: active ? defaultSchedule : null
        }))
    }

    const handleTimeChange = (dia: string, field: 'inicio' | 'fin', value: string) => {
        setHorario(prev => ({
            ...prev,
            [dia]: prev[dia] ? { ...prev[dia]!, [field]: value } : null
        }))
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const cleanHorario: any = {}
            Object.entries(horario).forEach(([dia, data]) => {
                if (data) cleanHorario[dia] = data
            })

            const { error } = await (supabase
                .from('barberos') as any)
                .update({
                    horario_laboral: cleanHorario,
                    bloqueo_almuerzo: almuerzo.activo ? {
                        inicio: almuerzo.inicio,
                        fin: almuerzo.fin
                    } : null
                })
                .eq('id', barbero.id)

            if (error) throw error
            toast.success('Horario actualizado correctamente')
            onSave()
        } catch (err: any) {
            toast.error('Error al guardar horario: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] glass-card border-border bg-card/95 text-foreground p-0 overflow-hidden max-h-[90vh] flex flex-col rounded-[2rem]">
                <div className="bg-gradient-to-b from-primary/10 to-transparent p-6 border-b border-border shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic tracking-tighter flex items-center gap-2 text-primary">
                            <Clock className="w-6 h-6" />
                            HORARIO LABORAL
                        </DialogTitle>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">
                            CONFIGURACIÓN PARA: <span className="text-foreground">{barbero.nombre.toUpperCase()}</span>
                        </p>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Lunch Break Section */}
                    <div className="p-4 rounded-xl bg-muted border border-border space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                                    🍽️
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Bloqueo de Almuerzo</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Intervalo diario de descanso</p>
                                </div>
                            </div>
                            <Switch
                                checked={almuerzo.activo}
                                onCheckedChange={(checked) => setAlmuerzo(prev => ({ ...prev, activo: checked }))}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        {almuerzo.activo && (
                            <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Inicio</Label>
                                    <Input
                                        type="time"
                                        value={almuerzo.inicio}
                                        onChange={(e) => setAlmuerzo(prev => ({ ...prev, inicio: e.target.value }))}
                                        className="bg-card border-border text-foreground h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Fin</Label>
                                    <Input
                                        type="time"
                                        value={almuerzo.fin}
                                        onChange={(e) => setAlmuerzo(prev => ({ ...prev, fin: e.target.value }))}
                                        className="bg-card border-border text-foreground h-9"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Días Laborales</h3>
                        <div className="space-y-2">
                            {diasSemana.map(dia => {
                                const isActive = !!horario[dia]
                                return (
                                    <div key={dia} className={cn(
                                        "flex items-center gap-4 p-3 rounded-xl transition-all duration-200 border",
                                        isActive ? "bg-muted border-border" : "bg-transparent border-transparent opacity-40"
                                    )}>
                                        <div className="w-24 flex items-center gap-3">
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={(checked) => handleDayToggle(dia, checked)}
                                                className="scale-90 data-[state=checked]:bg-primary"
                                            />
                                            <span className="capitalize text-xs font-bold text-foreground">{dia}</span>
                                        </div>

                                        {isActive ? (
                                            <div className="flex items-center gap-2 flex-1 animate-in fade-in duration-300">
                                                <Input
                                                    type="time"
                                                    value={horario[dia]?.inicio}
                                                    onChange={(e) => handleTimeChange(dia, 'inicio', e.target.value)}
                                                    className="bg-muted border-border text-foreground h-8 text-xs py-0"
                                                />
                                                <span className="text-muted-foreground font-bold">-</span>
                                                <Input
                                                    type="time"
                                                    value={horario[dia]?.fin}
                                                    onChange={(e) => handleTimeChange(dia, 'fin', e.target.value)}
                                                    className="bg-muted border-border text-foreground h-8 text-xs py-0"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-1 text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-right pr-4">
                                                No Laboral
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-border shrink-0 bg-muted/20">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted font-bold uppercase tracking-widest text-[10px]"
                    >
                        CANCELAR
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] px-8 hover:opacity-90 disabled:opacity-50 rounded-xl transition-all"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'GUARDAR HORARIO'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ============================================================
// ASISTENCIA TAB COMPONENT
// ============================================================
function AsistenciaTab({
    attendanceList,
    loading,
    onCheckIn,
    onCheckOut,
    professional
}: {
    attendanceList: any[]
    loading: boolean
    onCheckIn: (b: any) => void
    onCheckOut: (b: any) => void
    professional: string
}) {
    const fmtTime = (iso: string | null) => {
        if (!iso) return '--:--'
        return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
    }

    const getStatusBadge = (item: any) => {
        const att = item.asistencia
        if (!att) return { label: 'Sin Registro', color: 'text-muted-foreground/40 bg-muted border-border' }
        if (att.estado === 'tarde') return { label: 'Tarde', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
        if (att.estado === 'falta') return { label: 'Falta', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
        return { label: 'A Tiempo', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground text-sm animate-pulse">Cargando asistencia...</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <p className="text-2xl font-black text-emerald-400">
                        {attendanceList.filter(i => i.asistencia?.estado === 'a_tiempo').length}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">A Tiempo</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                    <p className="text-2xl font-black text-amber-400">
                        {attendanceList.filter(i => i.asistencia?.estado === 'tarde').length}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Tarde</p>
                </div>
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                    <p className="text-2xl font-black text-red-400">
                        {attendanceList.filter(i => !i.asistencia).length}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Sin Entrada</p>
                </div>
            </div>

            {/* Staff list */}
            <Card className="glass-card border-border overflow-hidden">
                {attendanceList.length === 0 ? (
                    <div className="p-16 text-center">
                        <AlertCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">No hay {professional}s activos hoy</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {attendanceList.map((item) => {
                            const badge = getStatusBadge(item)
                            const hasEntry = !!item.asistencia?.hora_entrada
                            const hasExit = !!item.asistencia?.hora_salida
                            return (
                                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-foreground/[0.02] transition-colors">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center font-black text-foreground shrink-0">
                                        {item.nombre.charAt(0)}
                                    </div>

                                    {/* Name + status */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground text-sm truncate">{item.nombre}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border', badge.color)}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Times */}
                                    <div className="hidden sm:flex items-center gap-4 text-center">
                                        <div>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Entrada</p>
                                            <p className="text-sm font-black text-foreground tabular-nums">
                                                {fmtTime(item.asistencia?.hora_entrada)}
                                            </p>
                                        </div>
                                        <div className="w-px h-6 bg-border" />
                                        <div>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Salida</p>
                                            <p className="text-sm font-black text-foreground tabular-nums">
                                                {fmtTime(item.asistencia?.hora_salida)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {!hasEntry && (
                                            <Button
                                                size="sm"
                                                onClick={() => onCheckIn(item)}
                                                className="h-8 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black rounded-lg"
                                            >
                                                <Check className="w-3 h-3 mr-1" />
                                                Entrada
                                            </Button>
                                        )}
                                        {hasEntry && !hasExit && (
                                            <Button
                                                size="sm"
                                                onClick={() => onCheckOut(item)}
                                                className="h-8 px-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-black rounded-lg"
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Salida
                                            </Button>
                                        )}
                                        {hasEntry && hasExit && (
                                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                                Completado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>
        </div>
    )
}

function getDemoAttendance() {
    const now = new Date()
    const lateTime = new Date(now)
    lateTime.setHours(9, 45, 0, 0)
    return [
        {
            id: 'demo-1', nombre: 'Carlos Hernández', estacion_id: 1, activo: true,
            asistencia: { id: 'a1', hora_entrada: lateTime.toISOString(), hora_salida: null, estado: 'tarde', observaciones: '' }
        },
        {
            id: 'demo-2', nombre: 'Miguel Ángel López', estacion_id: 2, activo: true,
            asistencia: { id: 'a2', hora_entrada: new Date(now.setHours(9, 0)).toISOString(), hora_salida: null, estado: 'a_tiempo', observaciones: '' }
        },
        {
            id: 'demo-3', nombre: 'Roberto Sánchez', estacion_id: 3, activo: true,
            asistencia: null
        }
    ]
}
