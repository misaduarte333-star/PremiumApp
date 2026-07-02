'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Home() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)
    const [checkingSession, setCheckingSession] = useState(true)

    // Check for existing sessions on mount
    useEffect(() => {
        const adminSession = localStorage.getItem('admin_session')
        const proSession = localStorage.getItem('profesional_session')

        if (adminSession) {
            try {
                const parsed = JSON.parse(adminSession)
                if (parsed?.id) {
                    // Clear profesional session to avoid cross-contamination
                    localStorage.removeItem('profesional_session')
                    router.replace('/admin')
                    return
                }
            } catch {
                localStorage.removeItem('admin_session')
            }
        }

        if (proSession) {
            try {
                const parsed = JSON.parse(proSession)
                if (parsed?.id) {
                    // Clear admin session to avoid cross-contamination
                    localStorage.removeItem('admin_session')
                    router.replace('/tablet')
                    return
                }
            } catch {
                localStorage.removeItem('profesional_session')
            }
        }

        setCheckingSession(false)
    }, [router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (loading) return

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login-unified', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Credenciales incorrectas')
                return
            }

            if (data.success && data.user) {
                if (data.role === 'admin') {
                    // Clear any existing profesional session before saving admin session
                    localStorage.removeItem('profesional_session')
                    localStorage.setItem('admin_session', JSON.stringify(data.user))
                    window.dispatchEvent(new Event('admin-session-changed'))
                    router.replace('/admin')
                } else if (data.role === 'profesional') {
                    // Clear any existing admin session before saving profesional session
                    localStorage.removeItem('admin_session')
                    localStorage.setItem('profesional_session', JSON.stringify(data.user))
                    router.replace('/tablet')
                }
            }
        } catch (err) {
            console.error('Unified login error:', err)
            setError('Error de conexión con el servidor')
        } finally {
            setLoading(false)
        }
    }

    if (checkingSession) {
        return (
            <main className="fixed inset-0 flex flex-col justify-center items-center bg-black">
                <div className="relative w-16 h-16 flex items-center justify-center rounded-full border-2 border-primary/20">
                    <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
                    <Shield className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-[10px] tracking-[0.3em] text-primary/60 font-bold uppercase mt-4">
                    Cargando Portal...
                </p>
            </main>
        )
    }

    return (
        <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#070412] selection:bg-primary selection:text-white">
            
            {/* === SIMPLE SOLID BACKGROUND === */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-[#070412]" />

            {/* === MAIN CONTENT === */}
            <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 py-8 animate-fade-in">
                
                {/* Logo & Title Section */}
                <header className="flex flex-col items-center mb-8 text-center">
                    <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-transparent opacity-20 blur-2xl scale-150" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src="/sonorus-logo.png" 
                            alt="SonorusApp Logo" 
                            className="w-20 h-20 object-contain filter brightness-100 relative z-10"
                        />
                    </div>

                    <h1 className="font-display font-black leading-[0.85] mb-4 text-4xl md:text-5xl">
                        <span className="block text-white tracking-tight uppercase">Sonorus</span>
                        <span className="block text-primary tracking-tighter uppercase">App</span>
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30" />
                        <p className="text-[9px] tracking-[0.5em] text-primary/60 font-bold uppercase">
                            Portal Unificado
                        </p>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
                    </div>
                </header>

                {/* Login Form */}
                <section className="w-full max-w-sm glass-card p-6 border-white/10 shadow-2xl relative">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        
                        {/* Email or Username Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="email" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'email' ? 'text-primary' : 'text-white/50'
                                }`}
                            >
                                Correo Electrónico o Usuario
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'email' 
                                    ? 'bg-black/80 ring-2 ring-primary/60 shadow-lg shadow-primary/10' 
                                    : 'bg-black/50 ring-1 ring-white/10 hover:ring-white/20'
                            }`}>
                                <Mail className={`w-4 h-4 ml-3 transition-colors duration-200 ${
                                    focusedField === 'email' ? 'text-primary' : 'text-white/30'
                                }`} />
                                <input
                                    id="email"
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-white placeholder:text-white/25 font-medium text-sm focus:ring-0"
                                    placeholder="usuario@negocio.com o tu usuario"
                                    autoComplete="username"
                                    required
                                    style={{ fontFamily: 'var(--font-sans), sans-serif' }}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <label 
                                htmlFor="password" 
                                className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-white/50'
                                }`}
                            >
                                Contraseña
                            </label>
                            <div className={`relative flex items-center gap-2 rounded-lg transition-all duration-300 ${
                                focusedField === 'password' 
                                    ? 'bg-black/80 ring-2 ring-primary/60 shadow-lg shadow-primary/10' 
                                    : 'bg-black/50 ring-1 ring-white/10 hover:ring-white/20'
                            }`}>
                                <Lock className={`w-4 h-4 ml-3 transition-colors duration-200 ${
                                    focusedField === 'password' ? 'text-primary' : 'text-white/30'
                                }`} />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="flex-1 bg-transparent border-none outline-none py-3 pr-3 text-white placeholder:text-white/25 font-medium text-sm focus:ring-0"
                                    placeholder="Ingresa tu contraseña"
                                    autoComplete="current-password"
                                    required
                                    style={{ fontFamily: 'var(--font-sans), sans-serif' }}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg animate-slide-in">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-xs font-medium text-red-400">{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="relative w-full py-3.5 mt-2 rounded-lg font-bold text-sm uppercase tracking-wider overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group bg-primary hover:bg-primary-dark text-white hover:shadow-md hover:shadow-primary/20"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Iniciar Sesión</span>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>
                </section>
            </div>

            <footer className="relative z-10 pb-6 flex flex-col items-center gap-2">
                <p className="text-[8px] tracking-[0.5em] text-white/30 font-bold uppercase text-center max-w-xs leading-relaxed">
                    SonorusApp<br/>Todos los derechos reservados &copy; {new Date().getFullYear()}
                </p>
            </footer>
        </main>
    )
}
