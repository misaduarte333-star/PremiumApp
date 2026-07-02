-- ============================================================================
-- BarberCloud AI - Store Management migrations
-- 1. Add email character varying UNIQUE to barberos
-- 2. Create public.registro_asistencia
-- 3. Create public.cierres_caja
-- ============================================================================

-- 1. Add email column to barberos (and fill it for existing barbers)
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS email character varying UNIQUE;

-- Fill existing barbers with a placeholder email so the unique constraint is satisfied
UPDATE public.barberos 
SET email = LOWER(usuario_tablet) || '@barberia.com' 
WHERE email IS NULL;

-- 2. Create public.registro_asistencia table
CREATE TABLE IF NOT EXISTS public.registro_asistencia (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  barbero_id uuid NOT NULL,
  sucursal_id uuid NOT NULL,
  fecha date NOT NULL,
  hora_entrada timestamp with time zone NOT NULL,
  hora_salida timestamp with time zone,
  estado character varying DEFAULT 'a_tiempo'::character varying,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registro_asistencia_pkey PRIMARY KEY (id),
  CONSTRAINT registro_asistencia_barbero_id_fkey FOREIGN KEY (barbero_id) REFERENCES public.barberos(id) ON DELETE CASCADE,
  CONSTRAINT registro_asistencia_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE CASCADE,
  CONSTRAINT registro_asistencia_barbero_id_fecha_key UNIQUE (barbero_id, fecha),
  CONSTRAINT registro_asistencia_estado_check CHECK (estado::text = ANY (ARRAY['a_tiempo'::character varying, 'tarde'::character varying, 'falta'::character varying]::text[]))
);

-- 3. Create public.cierres_caja table
CREATE TABLE IF NOT EXISTS public.cierres_caja (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sucursal_id uuid NOT NULL,
  fecha date NOT NULL,
  monto_apertura numeric NOT NULL DEFAULT 0,
  monto_ventas_efectivo numeric NOT NULL DEFAULT 0,
  monto_ventas_tarjeta numeric NOT NULL DEFAULT 0,
  monto_ventas_transferencia numeric NOT NULL DEFAULT 0,
  monto_gastos numeric NOT NULL DEFAULT 0,
  monto_cierre_esperado numeric NOT NULL DEFAULT 0,
  monto_cierre_real numeric NOT NULL DEFAULT 0,
  diferencia numeric NOT NULL DEFAULT 0,
  estado character varying DEFAULT 'abierta'::character varying,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cierres_caja_pkey PRIMARY KEY (id),
  CONSTRAINT cierres_caja_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales(id) ON DELETE CASCADE,
  CONSTRAINT cierres_caja_sucursal_id_fecha_key UNIQUE (sucursal_id, fecha),
  CONSTRAINT cierres_caja_estado_check CHECK (estado::text = ANY (ARRAY['abierta'::character varying, 'cerrada'::character varying]::text[]))
);

-- Row Level Security (RLS) policies
ALTER TABLE public.registro_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.registro_asistencia 
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON public.cierres_caja 
  FOR ALL USING (true);

-- Grant privileges for public / anon access (matching existing policies)
GRANT ALL ON TABLE public.registro_asistencia TO anon;
GRANT ALL ON TABLE public.registro_asistencia TO authenticated;
GRANT ALL ON TABLE public.cierres_caja TO anon;
GRANT ALL ON TABLE public.cierres_caja TO authenticated;
