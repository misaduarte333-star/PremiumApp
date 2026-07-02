# Guía del Micrositio Público de Clientes (Plantilla)

Esta carpeta contiene la plantilla y guía técnica para desplegar el micrositio público de clientes en un proyecto Next.js independiente.

---

## 1. Descripción de la Interfaz

El micrositio es una página web de una sola página (Single Page Application) diseñada con una estética **Premium Dark Mode** y gradientes morados y dorados, coherente con el sistema de diseño del negocio. Su estructura consta de:

1. **Barra de Navegación**:
   - Cabecera fija con efecto vidrio (*blur*).
   - Enlaces de salto interno (*Disponibilidad*, *Recomendaciones*, *Galería*, *Reseñas*).
   - Botón de Llamada a la Acción (CTA) para agendar directamente por WhatsApp.
2. **Hero Section (Presentación)**:
   - Título de alto impacto visual con gradientes fluidos.
   - Selector dinámico de sucursal (en caso de que el negocio cuente con múltiples ubicaciones).
3. **Agenda en Tiempo Real (Widget)**:
   - Panel interactivo que lista los profesionales activos.
   - Para cada profesional, calcula dinámicamente sus horas ocupadas (citas activas en BD), horas libres y horas pasadas del día.
   - Los botones de horario libre redireccionan automáticamente al WhatsApp del negocio con un mensaje personalizado y autocompletado con el nombre del profesional y la hora seleccionada.
4. **Recomendaciones de Estilos**:
   - Cuadrícula de tarjetas descriptivas para cortes en tendencia (*French Crop*, *Textured Fade*, etc.) indicando rostro ideal y mantenimiento.
5. **Galería Dinámica**:
   - Muestra las fotografías de cortes reales tomadas por los profesionales desde la aplicación interna de tableta.
   - Incluye filtros interactivos por categoría (*Todos*, *Cortes*, *Barba*, *Combos*).
6. **Reseñas de Google**:
   - Resumen de calificación (4.9 estrellas) y cuadrícula de testimonios detallados de clientes con insignia de "Cliente Verificado".
7. **Pie de Página (Footer)**:
   - Información de contacto, mapa y horarios de atención actualizados dinámicamente según la sucursal seleccionada.

---

## 2. Arquitectura y Cómo está Construido

El micrositio está desarrollado bajo las siguientes tecnologías y patrones:

- **Framework**: Next.js (App Router, Client Component `'use client'`).
- **Diseño**: Tailwind CSS (clases utilitarias y variables CSS en `globals.css`).
- **Iconografía**: `lucide-react`.
- **Animaciones**: `framer-motion` (utilizado para el menú móvil y el despliegue dinámico del menú contextual *Más*).
- **Backend / Base de Datos**: Supabase JS Client para consultas de datos en tiempo real.
- **Sincronización en Vivo**: Implementa WebSockets mediante `supabase.channel` para escuchar eventos en las tablas `citas` y `fotos_cortes`. Cuando una cita se agenda o se sube una foto, la interfaz se refresca automáticamente sin recargar la página.

---

## 3. Requisitos Previos para otro Proyecto

Para migrar esta plantilla a un proyecto independiente, asegúrate de contar con los siguientes elementos:

### Dependencias de NPM:
```bash
npm install @supabase/supabase-js lucide-react framer-motion clsx tailwind-merge
```

### Utilidades Requeridas:
Debes copiar o adaptar la función `cn` y las funciones de fecha en tu archivo de utilerías (equivalente a `@/lib/utils.ts`):
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getHermosilloDateStr(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Hermosillo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

export function getHermosilloMins(date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Hermosillo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return h * 60 + m;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}
```

### Estructura de Base de Datos (Tablas Requeridas en Supabase):
1. **`sucursales`**:
   - `id` (uuid)
   - `nombre` (text)
   - `direccion` (text)
   - `telefono_whatsapp` (text)
   - `activa` (boolean)
2. **`barberos`**:
   - `id` (uuid)
   - `nombre` (text)
   - `sucursal_id` (uuid)
   - `activo` (boolean)
   - `estacion_id` (int)
3. **`servicios`**:
   - `id` (uuid)
   - `nombre` (text)
   - `precio` (numeric)
   - `activo` (boolean)
4. **`fotos_cortes`**:
   - `id` (uuid)
   - `barbero_id` (uuid)
   - `servicio_id` (uuid)
   - `url` (text)
5. **`vista_citas_app`**:
   - Vista que une `citas` con sus estados locales: `timestamp_inicio_local`, `timestamp_fin_local`, `sucursal_id`, `barbero_id`, `estado`.
