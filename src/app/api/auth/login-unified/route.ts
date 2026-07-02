import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Correo y contraseña son requeridos' },
                { status: 400 }
            )
        }

        const lowerEmail = email.toLowerCase().trim()
        const supabase = createClient()

        // 1. Try to find the user in usuarios_admin
        const { data: admins, error: adminError } = await supabase
            .from('usuarios_admin')
            .select('*, sucursales!inner(plan, nombre)')
            .eq('email', lowerEmail)
            .eq('activo', true)
            .limit(1)

        if (adminError) {
            console.error('Error fetching admin:', adminError)
        }

        const admin = admins?.[0] as any

        if (admin) {
            // Compare password
            const isMatch = await bcrypt.compare(password, admin.password_hash || '')
            const isValid = isMatch || admin.password_hash === password // fallback for plain text

            if (isValid) {
                if (admin.sucursales?.plan !== 'premium') {
                    return NextResponse.json(
                        { error: 'Tu suscripción es Básica. Por favor inicia sesión mediante BarberiaPanel.' },
                        { status: 403 }
                    )
                }

                // Remove password hash before returning
                const { password_hash, ...adminData } = admin
                return NextResponse.json({
                    success: true,
                    role: 'admin',
                    user: adminData
                })
            }
        }

        // 2. If not found in admin, try to find in barberos
        const { data: barberos, error: barberoError } = await supabase
            .from('barberos')
            .select('*, sucursales!inner(plan, nombre)')
            .or(`email.eq.${lowerEmail},usuario_tablet.eq.${lowerEmail}`)
            .eq('activo', true)
            .limit(1)

        if (barberoError) {
            console.error('Error fetching barbero:', barberoError)
        }

        const barbero = barberos?.[0] as any

        if (barbero) {
            // Compare password
            const isMatch = await bcrypt.compare(password, barbero.password_hash || '')
            const isValid = isMatch || barbero.password_hash === password // fallback for plain text

            if (isValid) {
                if (barbero.sucursales?.plan !== 'premium') {
                    return NextResponse.json(
                        { error: 'Tu suscripción es Básica. Por favor inicia sesión mediante BarberiaPanel.' },
                        { status: 403 }
                    )
                }

                // Remove password hash before returning
                const { password_hash, ...barberoData } = barbero
                return NextResponse.json({
                    success: true,
                    role: 'profesional',
                    user: barberoData
                })
            }
        }

        // 3. If not found in either or password invalid
        return NextResponse.json(
            { error: 'Credenciales incorrectas' },
            { status: 401 }
        )

    } catch (err: any) {
        console.error('Unified login error:', err)
        return NextResponse.json(
            { error: 'Ocurrió un error inesperado al iniciar sesión' },
            { status: 500 }
        )
    }
}
