'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { 
    TrendingUp,
    Wallet,
    Calendar as CalendarIcon,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    CreditCard,
    DollarSign,
    RefreshCw,
    Trash2,
    Edit3,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    BarChart3,
    Table as TableIcon,
    Building2,
    Receipt,
    Repeat,
    Search, 
    FileText, 
    Filter, 
    ChevronDown, 
    MoreVertical, 
    Pencil, 
    X, 
    Banknote, 
    ReceiptText, 
    History,
    Check
} from 'lucide-react'
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { KPICard } from '@/components/KPICard'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth as endOfMonthDate } from 'date-fns'
import { es } from 'date-fns/locale'
import { Progress } from '@/components/ui/progress'
import type { Barbero, CitaDesdeVista, Gasto } from '@/lib/types'

export default function FinanzasPage() {
    const { sucursalId, loading: authLoading } = useAuth()
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())

    // Main tab
    const [activeFinanzasTab, setActiveFinanzasTab] = useState<'gastos' | 'cierre_caja'>('gastos')
    
    // Form state
    const [descripcion, setDescripcion] = useState('')
    const [monto, setMonto] = useState('')
    const [fechaPago, setFechaPago] = useState<Date | undefined>(new Date())
    const [esRecurrente, setEsRecurrente] = useState(false)
    const [pagado, setPagado] = useState(false)
    const [sucursalIdLocal, setSucursalIdLocal] = useState<string | null>(sucursalId || null)
    
    // Recurrence details
    const [frecuencia, setFrecuencia] = useState<'mensual' | 'semanal' | 'diario' | 'anual'>('mensual')
    const [diaSemana, setDiaSemana] = useState<string>('')
    const [diaMes, setDiaMes] = useState<number>(new Date().getDate())
    const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | ''>('')
    const [detallesPago, setDetallesPago] = useState('')
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
    const [gastoToPay, setGastoToPay] = useState<Gasto | null>(null)
    const [montoConfirmacion, setMontoConfirmacion] = useState('')
    const [showRecurrenceAlert, setShowRecurrenceAlert] = useState(false)
    const [updateFutureRecurrence, setUpdateFutureRecurrence] = useState(false)

    // Business states
    const [loadingIncome, setLoadingIncome] = useState(false)
    const [businessStats, setBusinessStats] = useState({
        totalBruto: 0,
        totalRevenueNegocio: 0,
        totalExpensesNegocio: 0,
        netProfit: 0,
        barberContributions: [] as { id: string, nombre: string, generado: number }[]
    })

    // ── Cierre de Caja state ──────────────────────────────────────
    const [cierreCajaHoy, setCierreCajaHoy] = useState<any>(null)
    const [loadingCierre, setLoadingCierre] = useState(false)
    const [savingCierre, setSavingCierre] = useState(false)
    const [montoApertura, setMontoApertura] = useState('')
    const [montoContado, setMontoContado] = useState('')
    const [observacionesCierre, setObservacionesCierre] = useState('')
    const [ventasHoy, setVentasHoy] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0 })
    const [gastosEfectivoHoy, setGastosEfectivoHoy] = useState(0)

    const supabase = createClient()

    const fetchGastos = async () => {
        setLoading(true)
        try {
            // Fetch ALL business expenses (where barbero_id is null)
            const { data, error } = await supabase
                .from('gastos')
                .select('*')
                .is('barbero_id', null)
                .eq('sucursal_id', sucursalId)
                .order('fecha_pago', { ascending: true })
            
            if (error) throw error

            setGastos((data as any[] as Gasto[]) || [])
        } catch (error: any) {
            console.error('Error fetching gastos:', error)
            toast.error('Error al cargar gastos del negocio')
            setGastos([])
        } finally {
            setLoading(false)
        }
    }

    const fetchBusinessMetrics = async () => {
        setLoadingIncome(true)
        try {
            const startStr = format(startOfMonth(new Date()), 'yyyy-MM-dd')
            const endStr = format(endOfMonthDate(new Date()), 'yyyy-MM-dd')

            // 1. Fetch appointments for all barbers for the month
            const { data: citas, error: citasError } = await supabase
                .from('vista_citas_app')
                .select('*')
                .eq('sucursal_id', sucursalId)
                .eq('estado', 'finalizada')
                .gte('fecha_cita_local', startStr)
                .lte('fecha_cita_local', endStr)

            if (citasError) throw citasError

            // 2. Fetch business expenses (already in gastos state, but let's calculate here for accuracy)
            const { data: businessGastos, error: gastosError } = await supabase
                .from('gastos')
                .select('monto')
                .is('barbero_id', null)
                .eq('sucursal_id', sucursalId)
                .gte('fecha_pago', startStr)
                .lte('fecha_pago', endStr)

            if (gastosError) throw gastosError

            // Calculations
            let totalBruto = 0
            let totalRevenueNegocio = 0
            const contributions: Record<string, { id: string, nombre: string, generado: number }> = {}

            citas?.forEach((cita: any) => {
                const monto = cita.monto_pagado || cita.servicio_precio || 0
                totalBruto += monto
                
                // If comision_barbero is not present, assume 50/50
                const comisionBarbero = cita.comision_barbero || (monto * 0.5)
                const comisionNegocio = monto - comisionBarbero
                totalRevenueNegocio += comisionNegocio

                if (cita.barbero_id) {
                    if (!contributions[cita.barbero_id]) {
                        contributions[cita.barbero_id] = { id: cita.barbero_id, nombre: cita.barbero_nombre, generado: 0 }
                    }
                    contributions[cita.barbero_id].generado += comisionNegocio
                }
            })

            const totalExpensesNegocio = (businessGastos as any[])?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0

            setBusinessStats({
                totalBruto,
                totalRevenueNegocio,
                totalExpensesNegocio,
                netProfit: totalRevenueNegocio - totalExpensesNegocio,
                barberContributions: Object.values(contributions).sort((a,b) => b.generado - a.generado)
            })
        } catch (error) {
            console.error('Error fetching business metrics:', error)
        } finally {
            setLoadingIncome(false)
        }
    }

    const fetchCierreCajaHoy = useCallback(async () => {
        if (!sucursalId) return
        setLoadingCierre(true)
        try {
            const todayStr = new Date().toLocaleDateString('en-CA')

            // 1. Get or initialize today's cash register record
            const { data: cierre } = await (supabase as any)
                .from('cierres_caja')
                .select('*')
                .eq('sucursal_id', sucursalId)
                .eq('fecha', todayStr)
                .maybeSingle()

            setCierreCajaHoy(cierre || null)
            if (cierre?.monto_apertura) setMontoApertura(String(cierre.monto_apertura))

            // 2. Sum today's finalized appointments by payment method
            const { data: citasHoy } = await supabase
                .from('vista_citas_app')
                .select('monto_pagado, metodo_pago, servicio_precio')
                .eq('sucursal_id', sucursalId)
                .eq('estado', 'finalizada')
                .eq('fecha_cita_local', todayStr)

            const ventas = { efectivo: 0, tarjeta: 0, transferencia: 0 }
            ;(citasHoy || []).forEach((c: any) => {
                const mnt = c.monto_pagado ?? c.servicio_precio ?? 0
                if (c.metodo_pago === 'efectivo') ventas.efectivo += mnt
                else if (c.metodo_pago === 'tarjeta') ventas.tarjeta += mnt
                else if (c.metodo_pago === 'transferencia') ventas.transferencia += mnt
                else ventas.efectivo += mnt // default to cash if unknown
            })
            setVentasHoy(ventas)

            // 3. Sum today's paid cash expenses
            const { data: gastosHoy } = await supabase
                .from('gastos')
                .select('monto')
                .is('barbero_id', null)
                .eq('sucursal_id', sucursalId)
                .eq('pagado', true)
                .eq('metodo_pago', 'efectivo')
                .eq('fecha_pago', todayStr)

            const totalGastos = (gastosHoy || []).reduce((s: number, g: any) => s + (g.monto || 0), 0)
            setGastosEfectivoHoy(totalGastos)

        } catch (err) {
            console.error('Error fetching cierre de caja:', err)
        } finally {
            setLoadingCierre(false)
        }
    }, [supabase, sucursalId])

    const handleAbrirCaja = async () => {
        if (!montoApertura || !sucursalId) return
        setSavingCierre(true)
        try {
            const todayStr = new Date().toLocaleDateString('en-CA')
            const { error } = await (supabase as any)
                .from('cierres_caja')
                .upsert([{
                    sucursal_id: sucursalId,
                    fecha: todayStr,
                    monto_apertura: parseFloat(montoApertura),
                    estado: 'abierta'
                }], { onConflict: 'sucursal_id,fecha' })
            if (error) throw error
            toast.success('Caja abierta correctamente')
            fetchCierreCajaHoy()
        } catch (err: any) {
            toast.error('Error al abrir caja: ' + err.message)
        } finally {
            setSavingCierre(false)
        }
    }

    const handleCerrarCaja = async () => {
        if (!montoContado || !sucursalId) {
            toast.error('Ingresa el monto contado en caja')
            return
        }
        setSavingCierre(true)
        try {
            const todayStr = new Date().toLocaleDateString('en-CA')
            const apertura = parseFloat(montoApertura || '0')
            const esperado = apertura + ventasHoy.efectivo - gastosEfectivoHoy
            const real = parseFloat(montoContado)
            const diferencia = real - esperado

            const { error } = await (supabase as any)
                .from('cierres_caja')
                .upsert([{
                    sucursal_id: sucursalId,
                    fecha: todayStr,
                    monto_apertura: apertura,
                    monto_ventas_efectivo: ventasHoy.efectivo,
                    monto_ventas_tarjeta: ventasHoy.tarjeta,
                    monto_ventas_transferencia: ventasHoy.transferencia,
                    monto_gastos: gastosEfectivoHoy,
                    monto_cierre_esperado: esperado,
                    monto_cierre_real: real,
                    diferencia,
                    estado: 'cerrada',
                    observaciones: observacionesCierre || (diferencia !== 0 ? `Discrepancia de $${Math.abs(diferencia).toFixed(2)} ${diferencia > 0 ? '(sobrante)' : '(faltante)'}` : 'Sin diferencias')
                }], { onConflict: 'sucursal_id,fecha' })

            if (error) throw error
            toast.success('¡Cierre de caja registrado exitosamente!')
            setMontoContado('')
            fetchCierreCajaHoy()
        } catch (err: any) {
            toast.error('Error al cerrar caja: ' + err.message)
            // Demo fallback
            const apertura = parseFloat(montoApertura || '0')
            const esperado = apertura + ventasHoy.efectivo - gastosEfectivoHoy
            const real = parseFloat(montoContado)
            setCierreCajaHoy({
                estado: 'cerrada',
                monto_apertura: apertura,
                monto_cierre_esperado: esperado,
                monto_cierre_real: real,
                diferencia: real - esperado
            })
        } finally {
            setSavingCierre(false)
        }
    }

    useEffect(() => {
        if (authLoading || !sucursalId) return
        fetchGastos()
        fetchBusinessMetrics()
        fetchCierreCajaHoy()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [authLoading, sucursalId])

    const formattedDate = currentTime.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    }).replace(/^\w/, (c) => c.toUpperCase())

    const formattedTime = currentTime.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    })

    // fetchSucursal was moved interior or handled implicitly
    // fetchBarberos is now handled inside fetchBusinessMetrics indirectly or not needed if we iterate commissions

    const clearForm = () => {
        setDescripcion('')
        setMonto('')
        setFechaPago(new Date())
        setEsRecurrente(false)
        setFrecuencia('mensual')
        setDiaSemana('')
        setDiaMes(new Date().getDate())
        setPagado(false)
        setEditingGasto(null)
    }

    const openEditModal = (gasto: Gasto) => {
        setEditingGasto(gasto)
        setDescripcion(gasto.descripcion)
        setMonto(gasto.monto.toString())
        setFechaPago(new Date(gasto.fecha_pago))
        setEsRecurrente(gasto.es_recurrente)
        setFrecuencia((gasto.frecuencia as 'mensual' | 'semanal' | 'diario' | 'anual') || 'mensual')
        setDiaSemana(gasto.dia_semana || '')
        setDiaMes(gasto.dia_mes || new Date(gasto.fecha_pago).getDate())
        setPagado(gasto.pagado)
        setIsDialogOpen(true)
    }

    const openPayModal = (gasto: Gasto) => {
        setGastoToPay(gasto)
        setMontoConfirmacion(gasto.monto.toString())
        setIsPayDialogOpen(true)
        setShowRecurrenceAlert(false)
        setUpdateFutureRecurrence(false)
    }

    const handleSaveGasto = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!descripcion || !monto || !fechaPago) return

        const gastoData = {
            sucursal_id: sucursalId || editingGasto?.sucursal_id || '',
            descripcion,
            monto: parseFloat(monto),
            fecha_pago: fechaPago.toISOString(),
            pagado: pagado,
            es_recurrente: esRecurrente,
            frecuencia: esRecurrente ? frecuencia : null,
            dia_semana: esRecurrente && frecuencia === 'semanal' ? diaSemana : null,
            dia_mes: esRecurrente && frecuencia === 'mensual' ? diaMes : null,
            metodo_pago: pagado ? (editingGasto?.metodo_pago || 'efectivo') : null,
            detalles_pago: pagado ? (editingGasto?.detalles_pago || '') : null
        }
        try {
            if (!sucursalId && !editingGasto) {
                console.warn('No sucursalId found, trying to fetch before saving...')
                const { data } = await supabase.from('sucursales').select('id').eq('id', sucursalId).maybeSingle() as { data: { id: string } | null }
                if (data) setSucursalIdLocal(data.id)
                else throw new Error('No se encontró una sucursal para asociar el gasto. Por favor crea una sucursal primero.')
            }

            if (editingGasto) {
                const { error } = await (supabase as any)
                    .from('gastos')
                    .update(gastoData)
                    .eq('id', editingGasto.id)
                if (error) throw error
                toast.success('Gasto actualizado correctamente')
            } else {
                const { error } = await (supabase as any).from('gastos').insert([gastoData])
                if (error) throw error
                toast.success('Gasto añadido correctamente')
            }
            
            setIsDialogOpen(false)
            clearForm()
            fetchGastos()
        } catch (error: any) {
            console.error('Error saving gasto (Detailed):', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
                error
            })
            
            toast.error(`Error: ${error?.message || 'Error al guardar en la base de datos'}`)
            
            // Still fallback for demo purposes but warn the console
            console.warn('Falling back to demo mode due to save error')
            if (editingGasto) {
                const updatedGasto: Gasto = {
                    ...editingGasto,
                    ...gastoData,
                    updated_at: new Date().toISOString()
                }
                setGastos(prev => prev.map(g => g.id === editingGasto.id ? updatedGasto : g))
                toast.success('Gasto actualizado (Modo Demo)')
            } else {
                const mockGasto: Gasto = {
                    id: Math.random().toString(36).substr(2, 9),
                    ...gastoData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
                setGastos(prev => [...prev, mockGasto].sort((a, b) => new Date(a.fecha_pago).getTime() - new Date(b.fecha_pago).getTime()))
                toast.success('Gasto añadido (Modo Demo)')
            }
            setIsDialogOpen(false)
            clearForm()
        }
    }

    const handleConfirmPayment = async (forceUpdateFuture?: boolean) => {
        if (!gastoToPay || !metodoPago || !montoConfirmacion) {
            toast.error('Por favor completa todos los campos')
            return
        }

        const nuevoMonto = parseFloat(montoConfirmacion)
        const montoCambiado = nuevoMonto !== gastoToPay.monto
        const shouldUpdateFuture = forceUpdateFuture !== undefined ? forceUpdateFuture : updateFutureRecurrence

        // Si el monto cambió y no se ha mostrado la alerta, mostrarla
        if (montoCambiado && !showRecurrenceAlert && gastoToPay.es_recurrente && forceUpdateFuture === undefined) {
            setShowRecurrenceAlert(true)
            return
        }

        try {
            // Update individual record
            const updateData: any = {
                pagado: true,
                metodo_pago: metodoPago,
                detalles_pago: detallesPago,
                monto: nuevoMonto,
                updated_at: new Date().toISOString()
            }

            const { error } = await (supabase.from('gastos') as any)
                .update(updateData)
                .eq('id', gastoToPay.id)

            if (error) throw error

            // Si se pidió actualizar de forma recurrente, actualizamos todos los gastos futuros con misma descripción
            if (shouldUpdateFuture && gastoToPay.es_recurrente) {
                const { error: recurError } = await (supabase.from('gastos') as any)
                    .update({ monto: nuevoMonto })
                    .eq('descripcion', gastoToPay.descripcion)
                    .eq('es_recurrente', true)
                    .eq('pagado', false)
                
                if (recurError) console.error('Error updating future recurrence:', recurError)
                else toast.success('Precios futuros actualizados')
            }
            
            toast.success('¡Gasto pagado con éxito!')
            setIsPayDialogOpen(false)
            setGastoToPay(null)
            setMetodoPago('')
            setDetallesPago('')
            setMontoConfirmacion('')
            setShowRecurrenceAlert(false)
            setUpdateFutureRecurrence(false)
            fetchGastos()
        } catch (error: any) {
            console.error('Error confirming payment:', error)
            toast.error(`Error al registrar pago: ${error.message}`)
        }
    }

    const getGastoStatus = (gasto: Gasto) => {
        if (gasto.pagado) return 'paid'
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const fechaPagoParsed = new Date(gasto.fecha_pago)
        fechaPagoParsed.setHours(0, 0, 0, 0)
        
        const tomorrow = new Date(today)
        tomorrow.setDate(today.getDate() + 1)
        
        if (fechaPagoParsed < today) return 'overdue'
        if (fechaPagoParsed.getTime() === tomorrow.getTime()) return 'due_tomorrow'
        if (fechaPagoParsed.getTime() === today.getTime()) return 'due_today'
        
        return 'pending'
    }

    // Savings Calculation logic
    const savingsMetrics = useMemo(() => {
        const today = new Date()
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        // recurrent costs (unique by description)
        const recurrentesUnicos = new Map<string, number>()
        gastos.filter(g => g.es_recurrente).forEach(g => {
            recurrentesUnicos.set(g.descripcion, g.monto)
        })
        const sumRecurrentes = Array.from(recurrentesUnicos.values()).reduce((a, b) => a + b, 0)

        // one-time costs for current month
        const monthlyGastosPuntuales = gastos.filter(g => {
            if (g.es_recurrente) return false
            const d = new Date(g.fecha_pago)
            return d >= startOfMonth && d <= endOfMonth
        })

        const totalMonthly = sumRecurrentes + monthlyGastosPuntuales.reduce((sum, g) => sum + g.monto, 0)

        const vencidos = gastos.filter(g => getGastoStatus(g) === 'overdue').length
        const manana = gastos.filter(g => getGastoStatus(g) === 'due_tomorrow').length
        
        return {
            diario: totalMonthly / 30,
            semanal: totalMonthly / 4,
            mensual: totalMonthly,
            vencidos,
            manana
        }
    }, [gastos])

    const expectedCash = parseFloat(montoApertura || '0') + ventasHoy.efectivo - gastosEfectivoHoy

    return (
        <div className="relative min-h-full bg-background selection:bg-primary selection:text-black">
            <div className="space-y-6 lg:space-y-8 selection:bg-primary selection:text-black">
                {/* Header (Desktop Only) - Compact Elite Style */}
                <header className="hidden lg:flex h-16 px-0 items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border mb-4 font-display">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.15)]">
                            <TrendingUp className="w-7 h-7 text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground leading-none font-display">
                                Control <span className="text-gradient-gold italic">Financiero</span>
                            </h1>
                            <p className="text-muted-foreground mt-1 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70">
                                Egresos, caja y rentabilidad global
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Time & Date - Premium Compact Style */}
                        <div className="bg-muted/90 backdrop-blur-xl border border-border rounded-xl px-4 py-1.5 flex items-center gap-4 shadow-2xl hover:border-border transition-all group">
                            <div className="flex flex-col items-end">
                                <p className="text-xs font-black tracking-tighter tabular-nums leading-tight text-foreground">
                                    {formattedTime}
                                </p>
                                <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] leading-tight">
                                    {formattedDate}
                                </p>
                            </div>
                            <div className="h-6 w-[1px] bg-border group-hover:bg-primary/20 transition-colors" />
                            <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open)
                        if (!open) clearForm()
                    }}>
                        <DialogTrigger render={
                            <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-md shadow-primary/10 h-11 px-6 rounded-xl transition-all">
                                <Plus className="w-5 h-5 mr-2" />
                                Registrar Gasto
                            </Button>
                        } />
                        <DialogContent className="glass-card border-border bg-background/95 text-foreground max-w-lg rounded-[2.5rem] p-0 overflow-hidden shadow-2xl shadow-primary/10">
                            {/* Modal Content - same as before but styled */}
                            <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 border-b border-border">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-display text-primary tracking-tight uppercase">
                                        {editingGasto ? 'Editar Gasto' : 'Nuevo Registro'}
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-[0.2em]">
                                        {editingGasto ? 'Modifica los parámetros del gasto' : 'Añade un nuevo movimiento financiero'}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            
                            <form onSubmit={handleSaveGasto} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Descripción</Label>
                                    <Input 
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        className="bg-muted/50 border-border focus:border-primary/50 text-foreground rounded-xl h-11"
                                        placeholder="Ej: Renta del local"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Monto (MXN)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">$</span>
                                            <Input 
                                                type="number"
                                                value={monto}
                                                onChange={(e) => setMonto(e.target.value)}
                                                className="bg-muted/50 border-border focus:border-primary/50 text-foreground rounded-xl h-11 pl-8 font-display font-bold"
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Fecha</Label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                            <Input 
                                                type="date"
                                                value={fechaPago ? format(fechaPago, 'yyyy-MM-dd') : ''}
                                                onChange={(e) => setFechaPago(new Date(e.target.value))}
                                                className="bg-muted/50 border-border focus:border-primary/50 text-foreground rounded-xl h-11 pl-10 text-xs"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gasto Recurrente</Label>
                                            <p className="text-[9px] text-muted-foreground/50 uppercase font-bold">Generar automáticamente cada periodo</p>
                                        </div>
                                        <Switch checked={esRecurrente} onCheckedChange={setEsRecurrente} className="data-[state=checked]:bg-primary" />
                                    </div>

                                    {esRecurrente && (
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Frecuencia</Label>
                                                <Select value={frecuencia} onValueChange={(v: any) => setFrecuencia(v)}>
                                                    <SelectTrigger className="bg-background/50 border-border h-10 rounded-xl text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-background border-border text-foreground">
                                                        <SelectItem value="diario">Diario</SelectItem>
                                                        <SelectItem value="semanal">Semanal</SelectItem>
                                                        <SelectItem value="mensual">Mensual</SelectItem>
                                                        <SelectItem value="anual">Anual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {frecuencia === 'mensual' && (
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest pl-1">Día Cobro</Label>
                                                    <Input 
                                                        type="number" min="1" max="31" 
                                                        value={diaMes} onChange={(e) => setDiaMes(parseInt(e.target.value))}
                                                        className="bg-background/50 border-border h-10 rounded-xl text-xs"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado Actual</Label>
                                        <p className="text-[9px] text-muted-foreground/50 uppercase font-bold">{pagado ? 'Pago realizado' : 'Pendiente de pago'}</p>
                                    </div>
                                    <Switch checked={pagado} onCheckedChange={setPagado} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <DialogFooter className="pt-4 gap-2">
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-muted-foreground/60 hover:text-foreground uppercase text-[10px] font-black tracking-widest">Cancelar</Button>
                                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] px-8 h-11 rounded-xl shadow-md shadow-primary/10 transition-all">
                                        {editingGasto ? 'Guardar Cambios' : 'Registrar Gasto'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {/* ── TABS ─────────────────────────────────── */}
            <div className="flex items-center gap-6 border-b border-border/40 pb-1 font-display">
                <button
                    onClick={() => setActiveFinanzasTab('gastos')}
                    className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] pb-3 px-1 border-b-2 transition-all",
                        activeFinanzasTab === 'gastos'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    Egresos & Rentabilidad
                </button>
                <button
                    onClick={() => { setActiveFinanzasTab('cierre_caja'); fetchCierreCajaHoy() }}
                    className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] pb-3 px-1 border-b-2 transition-all flex items-center gap-2",
                        activeFinanzasTab === 'cierre_caja'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Banknote className="w-3 h-3" />
                    Cierre de Caja
                    {cierreCajaHoy?.estado === 'abierta' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                </button>
            </div>

            {/* ── CIERRE DE CAJA TAB ────────────────────── */}
            {activeFinanzasTab === 'cierre_caja' && (
                <div className="space-y-5">
                    {loadingCierre ? (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                        </div>
                    ) : (
                        <>
                        {/* Status banner */}
                        <div className={cn(
                            "p-4 rounded-2xl border flex items-center gap-4",
                            cierreCajaHoy?.estado === 'cerrada'
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : cierreCajaHoy?.estado === 'abierta'
                                    ? "bg-amber-500/5 border-amber-500/20"
                                    : "bg-muted border-border"
                        )}>
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                cierreCajaHoy?.estado === 'cerrada' ? "bg-emerald-500/10 text-emerald-400"
                                : cierreCajaHoy?.estado === 'abierta' ? "bg-amber-500/10 text-amber-400"
                                : "bg-muted text-muted-foreground"
                            )}>
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black uppercase tracking-widest text-foreground">
                                    {cierreCajaHoy?.estado === 'cerrada' ? 'Caja Cerrada Hoy'
                                    : cierreCajaHoy?.estado === 'abierta' ? 'Caja Abierta'
                                    : 'Sin Apertura de Caja Hoy'}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                    {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            {cierreCajaHoy?.estado === 'cerrada' && (
                                <div className={cn(
                                    "text-right",
                                )}
                                >
                                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Diferencia</p>
                                    <p className={cn(
                                        "text-lg font-black tabular-nums",
                                        cierreCajaHoy.diferencia === 0 ? "text-emerald-400"
                                        : cierreCajaHoy.diferencia > 0 ? "text-blue-400"
                                        : "text-red-400"
                                    )}>
                                        {cierreCajaHoy.diferencia >= 0 ? '+' : ''}{cierreCajaHoy.diferencia?.toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* LEFT: Apertura + Ventas del día */}
                            <Card className="glass-card border-border p-5 space-y-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                    Resumen del Día
                                </h3>

                                {/* Apertura */}
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Monto de Apertura</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black">$</span>
                                            <Input
                                                type="number"
                                                value={montoApertura}
                                                onChange={e => setMontoApertura(e.target.value)}
                                                disabled={cierreCajaHoy?.estado === 'cerrada'}
                                                className="pl-8 bg-muted border-border text-foreground font-bold focus:border-primary/50 rounded-xl"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        {(!cierreCajaHoy || cierreCajaHoy.estado !== 'cerrada') && (
                                            <Button
                                                onClick={handleAbrirCaja}
                                                disabled={savingCierre || !montoApertura}
                                                className="bg-primary hover:bg-primary/90 text-white font-black text-[9px] uppercase tracking-widest px-4 h-10 rounded-xl shrink-0 transition-all"
                                            >
                                                {cierreCajaHoy ? 'Actualizar' : 'Abrir Caja'}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Sales breakdown */}
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Ventas del Día</p>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Efectivo', value: ventasHoy.efectivo, color: 'text-emerald-400', icon: '💵' },
                                            { label: 'Tarjeta', value: ventasHoy.tarjeta, color: 'text-blue-400', icon: '💳' },
                                            { label: 'Transferencia', value: ventasHoy.transferencia, color: 'text-purple-400', icon: '📲' },
                                        ].map(item => (
                                            <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-muted border border-border">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">{item.icon}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.label}</span>
                                                </div>
                                                <span className={cn("font-black text-sm tabular-nums", item.color)}>${item.value.toFixed(2)}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">🧾</span>
                                                <span className="text-[10px] font-bold text-red-400/80 uppercase">Gastos en Efectivo</span>
                                            </div>
                                            <span className="font-black text-sm tabular-nums text-red-400">-${gastosEfectivoHoy.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expected total */}
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Efectivo Esperado en Caja</p>
                                        <p className="text-[8px] text-muted-foreground/40 font-medium mt-0.5">Apertura + Ventas Efectivo - Gastos</p>
                                    </div>
                                    <p className="text-2xl font-black text-primary tabular-nums">${expectedCash.toFixed(2)}</p>
                                </div>
                            </Card>

                            {/* RIGHT: Arqueo (count & close) */}
                            <Card className="glass-card border-border p-5 space-y-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                                    Arqueo de Caja
                                </h3>

                                {cierreCajaHoy?.estado === 'cerrada' ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { label: 'Esperado', value: cierreCajaHoy.monto_cierre_esperado, color: 'text-foreground' },
                                                { label: 'Contado', value: cierreCajaHoy.monto_cierre_real, color: 'text-foreground' },
                                            ].map(item => (
                                                <div key={item.label} className="p-3 rounded-xl bg-muted border border-border text-center">
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">{item.label}</p>
                                                    <p className={cn("text-lg font-black tabular-nums", item.color)}>${item.value?.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className={cn(
                                            "p-4 rounded-2xl border text-center",
                                            cierreCajaHoy.diferencia === 0 ? "bg-emerald-500/5 border-emerald-500/20"
                                            : cierreCajaHoy.diferencia > 0 ? "bg-blue-500/5 border-blue-500/20"
                                            : "bg-red-500/5 border-red-500/20"
                                        )}>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Diferencia</p>
                                            <p className={cn(
                                                "text-3xl font-black tabular-nums",
                                                cierreCajaHoy.diferencia === 0 ? "text-emerald-400"
                                                : cierreCajaHoy.diferencia > 0 ? "text-blue-400"
                                                : "text-red-400"
                                            )}>
                                                {cierreCajaHoy.diferencia > 0 ? '+' : ''}{cierreCajaHoy.diferencia?.toFixed(2)}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground/40 mt-2 uppercase font-bold">
                                                {cierreCajaHoy.diferencia === 0 ? '✅ Sin discrepancias' : cierreCajaHoy.diferencia > 0 ? '📈 Sobrante (registrado en auditoría)' : '⚠️ Faltante (registrado en auditoría)'}
                                            </p>
                                        </div>
                                        {cierreCajaHoy.observaciones && (
                                            <p className="text-[10px] text-muted-foreground/50 italic text-center">{cierreCajaHoy.observaciones}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {!cierreCajaHoy && (
                                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                                                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">⚠️ Abre caja primero ingresando el monto de apertura</p>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Efectivo Contado en Caja</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black">$</span>
                                                <Input
                                                    type="number"
                                                    value={montoContado}
                                                    onChange={e => setMontoContado(e.target.value)}
                                                    className="pl-8 bg-muted border-border text-foreground font-bold focus:border-primary/50 rounded-xl text-lg h-12"
                                                    placeholder="0.00"
                                                    disabled={!cierreCajaHoy}
                                                />
                                            </div>
                                        </div>

                                        {/* Live discrepancy preview */}
                                        {montoContado && cierreCajaHoy && (
                                            <div className={cn(
                                                "p-3 rounded-xl border flex items-center justify-between",
                                                parseFloat(montoContado) === expectedCash ? "bg-emerald-500/5 border-emerald-500/20"
                                                : parseFloat(montoContado) > expectedCash ? "bg-blue-500/5 border-blue-500/20"
                                                : "bg-red-500/5 border-red-500/20"
                                            )}>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Diferencia estimada</span>
                                                <span className={cn(
                                                    "text-lg font-black tabular-nums",
                                                    parseFloat(montoContado) === expectedCash ? "text-emerald-400"
                                                    : parseFloat(montoContado) > expectedCash ? "text-blue-400" : "text-red-400"
                                                )}>
                                                    {parseFloat(montoContado) - expectedCash >= 0 ? '+' : ''}
                                                    {(parseFloat(montoContado) - expectedCash).toFixed(2)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Observaciones (opcional)</Label>
                                            <Input
                                                value={observacionesCierre}
                                                onChange={e => setObservacionesCierre(e.target.value)}
                                                className="bg-muted border-border text-foreground focus:border-primary/50 rounded-xl"
                                                placeholder="Notas sobre el cierre..."
                                                disabled={!cierreCajaHoy}
                                            />
                                        </div>

                                        <Button
                                            onClick={handleCerrarCaja}
                                            disabled={savingCierre || !montoContado || !cierreCajaHoy}
                                            className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md shadow-primary/10 transition-all hover:opacity-90 disabled:opacity-40"
                                        >
                                            {savingCierre ? <RefreshCw className="w-4 h-4 animate-spin" /> : '🔒 Cerrar Caja y Registrar Auditoría'}
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </div>
                        </>
                    )}
                </div>
            )}

            {activeFinanzasTab === 'gastos' && (<>
            {/* Business Metrics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 leading-none">
                <KPICard 
                    title="Venta Bruta" 
                    value={`$${Math.round(businessStats.totalBruto).toLocaleString()}`}
                    icon={<DollarSign className="w-4 h-4 text-blue-400" />}
                    subtitle="Total recaudado (Cortes)"
                    color="blue"
                    className="h-full"
                />
                <KPICard 
                    title="Ingreso Negocio" 
                    value={`$${Math.round(businessStats.totalRevenueNegocio).toLocaleString()}`}
                    icon={<Building2 className="w-4 h-4 text-purple-400" />}
                    subtitle="Comisiones para el negocio"
                    color="purple"
                    className="h-full"
                />
                <KPICard 
                    title="Gastos Negocio" 
                    value={`$${Math.round(businessStats.totalExpensesNegocio).toLocaleString()}`}
                    icon={<Receipt className="w-4 h-4 text-amber-400" />}
                    subtitle="Egresos operativos"
                    color="amber"
                    className="h-full"
                />
                <KPICard 
                    title="Utilidad Neta" 
                    value={`$${Math.round(businessStats.netProfit).toLocaleString()}`}
                    icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                    subtitle="Ganancia real del mes"
                    color="emerald"
                    className="h-full"
                />
                <KPICard 
                    title="Pendiente Pago" 
                    value={`$${Math.round(gastos.filter(g => !g.pagado).reduce((sum, g) => sum + g.monto, 0)).toLocaleString()}`}
                    icon={<Clock className="w-4 h-4 text-blue-400" />}
                    subtitle="Gastos por liquidar"
                    color="blue"
                    className="h-full"
                />
            </div>

            {/* Pagos Vencidos / Próximos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={cn(
                    "glass-card border-border bg-card/40 overflow-hidden rounded-2xl relative group transition-all duration-300",
                    savingsMetrics.vencidos > 0 && "border-destructive/30 bg-destructive/5"
                )}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "size-10 rounded-xl flex items-center justify-center border transition-all",
                                savingsMetrics.vencidos > 0
                                    ? "bg-destructive/10 text-destructive border-destructive/20 shadow-lg shadow-destructive/10"
                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 opacity-50"
                            )}>
                                {savingsMetrics.vencidos > 0 ? (
                                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Pagos Vencidos</p>
                                <span className={cn("text-2xl font-black tracking-tighter leading-none", savingsMetrics.vencidos > 0 ? "text-destructive" : "text-foreground")}>
                                    {savingsMetrics.vencidos}
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-50">
                            {savingsMetrics.vencidos > 0 ? '¡Atención requerida!' : 'Todo al día'}
                        </p>
                        {savingsMetrics.vencidos > 0 && <div className="absolute -right-4 -bottom-4 size-20 rounded-full blur-3xl opacity-10 bg-destructive" />}
                    </CardContent>
                </Card>

                <Card className={cn(
                    "glass-card border-border bg-card/40 overflow-hidden rounded-2xl relative group transition-all duration-300",
                    savingsMetrics.manana > 0 && "border-amber-500/30 bg-amber-500/5"
                )}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "size-10 rounded-xl flex items-center justify-center border transition-all",
                                savingsMetrics.manana > 0
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/10"
                                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 opacity-50"
                            )}>
                                {savingsMetrics.manana > 0 ? (
                                    <Clock className="w-5 h-5 animate-bounce" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Vencen Mañana</p>
                                <span className={cn("text-2xl font-black tracking-tighter leading-none", savingsMetrics.manana > 0 ? "text-amber-500" : "text-foreground")}>
                                    {savingsMetrics.manana}
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic opacity-50">
                            {savingsMetrics.manana > 0 ? 'Preparar pagos' : 'Sin pendientes'}
                        </p>
                        {savingsMetrics.manana > 0 && <div className="absolute -right-4 -bottom-4 size-20 rounded-full blur-3xl opacity-10 bg-amber-500" />}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Payments Summary Table */}
            <Card className="glass-card border-border bg-card/40 overflow-hidden rounded-2xl">
                <CardHeader className="p-3 sm:p-5 pb-0">
                    <CardTitle className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                            <Receipt className="w-4 h-4" />
                        </div>
                        Resumen de Pagos
                        <Badge variant="outline" className="text-[8px] border-border text-muted-foreground ml-auto font-black">{gastos.length} registros</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-2">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left px-3 sm:px-5 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">Concepto</th>
                                    <th className="text-center px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">Fecha</th>
                                    <th className="text-right px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">Monto</th>
                                    <th className="text-center px-2 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">Estado</th>
                                    <th className="text-right px-3 sm:px-5 py-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastos.map(gasto => {
                                    const status = getGastoStatus(gasto)
                                    return (
                                        <tr key={gasto.id} className={cn(
                                            "border-b border-border hover:bg-muted/30 transition-colors",
                                            status === 'overdue' && "bg-destructive/5",
                                            status === 'due_today' && "bg-amber-500/5"
                                        )}>
                                            <td className="px-3 sm:px-5 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {gasto.es_recurrente && <Repeat className="w-3 h-3 text-amber-500" />}
                                                    <p className="text-[10px] sm:text-[11px] font-black text-foreground uppercase tracking-tight truncate max-w-[90px] sm:max-w-[180px]">{gasto.descripcion}</p>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <span className="text-[9px] font-bold text-muted-foreground">{format(new Date(gasto.fecha_pago), 'dd/MM/yy')}</span>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <span className="text-[10px] font-black text-amber-500">${gasto.monto.toLocaleString()}</span>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {status === 'overdue' && <Badge variant="outline" className="text-[7px] border-destructive/30 text-destructive h-4 px-1 font-black">VENC.</Badge>}
                                                {status === 'due_tomorrow' && <Badge variant="outline" className="text-[7px] border-amber-500/30 text-amber-500 h-4 px-1 font-black">MAÑANA</Badge>}
                                                {status === 'due_today' && <Badge variant="outline" className="text-[7px] border-orange-500/30 text-orange-400 h-4 px-1 font-black">HOY</Badge>}
                                                {status === 'paid' && <Badge variant="outline" className="text-[7px] border-emerald-500/30 text-emerald-400 h-4 px-1 font-black">PAGADO</Badge>}
                                                {status === 'pending' && <Badge variant="outline" className="text-[7px] border-border text-muted-foreground/50 h-4 px-1 font-black">PEND.</Badge>}
                                            </td>
                                            <td className="px-3 sm:px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!gasto.pagado ? (
                                                        <Button size="sm" className="h-7 px-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase rounded-lg hover:bg-emerald-500 hover:text-black transition-all whitespace-nowrap" onClick={() => openPayModal(gasto)}>
                                                            Pagar
                                                        </Button>
                                                    ) : (
                                                        <span className="text-[8px] font-black text-emerald-400/50 uppercase tracking-widest">Pagado</span>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/30 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors shrink-0" onClick={() => openEditModal(gasto)}>
                                                        <Pencil className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {gastos.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground/20 text-[10px] uppercase font-black tracking-widest">Sin pagos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Business Rentability Analysis Section */}
            <Card className="glass-card border-border bg-card/40 overflow-hidden rounded-[2.5rem] relative group border-indigo-500/10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-amber-500/5 opacity-50" />
                <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-4 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base sm:text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            Rentabilidad <span className="text-gold">Global</span><span className="hidden sm:inline"> · Operación del Negocio</span>
                        </CardTitle>
                        <CardDescription className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Visión consolidada de ingresos y gastos operativos</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-8 pt-2 sm:pt-4 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-10">
                        {/* Summary Stats */}
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Utilidad del Negocio (Comisiones)</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={cn("text-2xl sm:text-4xl font-black tracking-tighter", businessStats.netProfit >= 0 ? "text-emerald-500" : "text-destructive")}>
                                        ${businessStats.netProfit.toLocaleString()}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Este mes</span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Ratio de Ganancia Bruta</p>
                                    <p className="text-xs font-black text-amber-500 tracking-tight">${businessStats.totalRevenueNegocio.toLocaleString()}</p>
                                </div>
                                <div className="relative pt-2">
                                    <Progress 
                                        value={Math.min((businessStats.totalRevenueNegocio / (businessStats.totalExpensesNegocio || 1)) * 100, 100)} 
                                        className="h-3 bg-muted border border-border"
                                    />
                                    <div className="absolute -top-1 right-0 w-2 h-5 bg-amber-500/50 blur-[2px] rounded-full" style={{ left: '100%' }} />
                                </div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] text-center italic">
                                    {businessStats.netProfit >= 0 
                                        ? "✨ LA OPERACIÓN ES RENTABLE ESTES MES" 
                                        : `Se requieren $${Math.abs(businessStats.netProfit).toLocaleString()} adicionales para cubrir gastos`}
                                </p>
                            </div>
                        </div>

                        {/* Barber Contributions */}
                        <div className="lg:col-span-2">
                            <div className="bg-muted/30 border border-border rounded-3xl p-6 h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Contribución por Barbero (Negocio)</h4>
                                    <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">Sorteado por producción</span>
                                </div>
                                
                                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                    {businessStats.barberContributions.map((barber, idx) => (
                                        <div key={barber.id} className="flex items-center justify-between group p-2 rounded-xl hover:bg-foreground/[0.03] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-foreground group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{barber.nombre}</p>
                                                    <p className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest">Generado para el negocio</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-foreground tracking-tight">${barber.generado.toLocaleString()}</p>
                                                <div className="w-24 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500/40" 
                                                        style={{ width: `${Math.min((barber.generado / (businessStats.totalRevenueNegocio || 1)) * 100, 100)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {businessStats.barberContributions.length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-widest">No hay datos de producción este mes</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Confirmation Dialog */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent className="w-[94vw] max-w-md max-h-[90dvh] bg-background/95 border-border text-foreground backdrop-blur-2xl p-0 overflow-y-auto rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl shadow-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/5 opacity-50 pointer-events-none" />
                    
                    <DialogHeader className="p-4 sm:p-8 pb-0 relative z-10">
                        <div className="flex items-center justify-between mb-3 sm:mb-6">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                    <Banknote className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-400" />
                                </div>
                                <div className="space-y-0.5 sm:space-y-1">
                                    <DialogTitle className="text-base sm:text-2xl font-black tracking-tight text-foreground">Confirmar Pago</DialogTitle>
                                    <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Transacción Segura</DialogDescription>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsPayDialogOpen(false)}
                                className="rounded-full h-10 w-10 text-muted-foreground/20 hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {gastoToPay && (
                            <div className="bg-muted/30 border border-border rounded-2xl p-3 sm:p-6 mb-2 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <ReceiptText className="w-12 h-12 sm:w-16 sm:h-16" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mb-1.5 sm:mb-2">Resumen del Gasto</p>
                                <h4 className="text-sm sm:text-lg font-black text-foreground truncate mb-2 sm:mb-3">{gastoToPay.descripcion}</h4>
                                
                                <div className="relative mt-2">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-emerald-400/50 mb-1 block">Monto a Pagar</Label>
                                    <div className="flex items-center gap-2 sm:gap-3 bg-background border border-border rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 focus-within:border-emerald-500/50 transition-colors">
                                        <span className="text-muted-foreground/40 text-lg sm:text-xl font-black">$</span>
                                        <input 
                                            type="number"
                                            value={montoConfirmacion}
                                            onChange={(e) => setMontoConfirmacion(e.target.value)}
                                            className="bg-transparent border-none text-xl sm:text-2xl font-black text-foreground focus:ring-0 w-full p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-[10px] font-bold text-muted-foreground/20 uppercase">MXN</span>
                                    </div>
                                    <p className="text-[8px] font-bold text-muted-foreground/20 mt-1 uppercase italic">* Puedes modificar el monto si aumentó</p>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    <div className="p-4 sm:p-8 pt-3 sm:pt-6 space-y-4 sm:space-y-8 relative z-10">
                        {showRecurrenceAlert ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center space-y-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto border border-amber-500/30">
                                        <span className="material-icons-round text-3xl text-amber-500">update</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-black text-amber-500">¿Actualizar recurrencia?</h4>
                                        <p className="text-xs text-muted-foreground font-medium px-4">Detectamos que el monto cambió. ¿Quieres que este nuevo monto se aplique a los próximos pagos automáticos?</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Button
                                            onClick={() => {
                                                handleConfirmPayment(false)
                                            }}
                                            className="h-12 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-black text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            Solo hoy
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                handleConfirmPayment(true)
                                            }}
                                            className="h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
                                        >
                                            Actualizar todos
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 px-1 ml-1 flex items-center gap-2">
                                            <span className="material-icons-round text-xs">account_balance_wallet</span>
                                            Método de Pago
                                        </Label>
                                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                            {[
                                                { id: 'efectivo', label: 'Efectivo', icon: <Banknote className="w-4 h-4" /> },
                                                { id: 'tarjeta', label: 'Tarjeta', icon: <CreditCard className="w-4 h-4" /> },
                                                { id: 'transferencia', label: 'Transf.', icon: <Wallet className="w-4 h-4" /> }
                                            ].map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setMetodoPago(m.id as any)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-1 sm:gap-2 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300",
                                                        metodoPago === m.id 
                                                            ? "bg-primary/20 border-primary/50 text-primary shadow-lg shadow-primary/10 scale-95" 
                                                            : "bg-muted/30 border-border text-muted-foreground/40 hover:bg-muted hover:border-border/50"
                                                    )}
                                                >
                                                    <div>{m.icon}</div>
                                                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 px-1 ml-1 flex items-center gap-2">
                                            <History className="w-3 h-3" />
                                            Notas adicionales
                                        </Label>
                                        <div className="relative group">
                                            <Input 
                                                placeholder="Ticket, referencia o banco..." 
                                                className="bg-muted/30 border-border text-foreground h-11 sm:h-14 rounded-xl sm:rounded-2xl focus:ring-primary/20 focus:border-primary/30 pl-12 transition-all"
                                                value={detallesPago}
                                                onChange={(e) => setDetallesPago(e.target.value)}
                                            />
                                            <Pencil className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 sm:gap-3 pt-1">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={() => setIsPayDialogOpen(false)}
                                        className="flex-1 h-11 rounded-xl text-muted-foreground/40 hover:bg-muted font-black uppercase tracking-widest text-[10px] border border-transparent hover:border-border transition-all"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button 
                                        onClick={() => handleConfirmPayment()}
                                        disabled={!metodoPago}
                                        className="flex-[2] h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-md shadow-primary/10 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            Confirmar Pago
                                            <Check className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                        </span>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="h-2 bg-primary/20 relative">
                        <div className="absolute inset-0 bg-primary animate-pulse opacity-50" />
                    </div>
                </DialogContent>
            </Dialog>
            </>)}
            </div>
        </div>
    )
}
