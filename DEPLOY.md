# Despliegue en AWS EC2 con EasyPanel

## Descripción General

PremiumApp es una aplicación Next.js 15 completamente dockerizada. Puede ser desplegada en AWS EC2 usando EasyPanel.

## Requisitos Previos

- Cuenta en AWS
- EasyPanel instalado en una instancia EC2
- GitHub Personal Access Token (PAT)
- Variables de entorno de Supabase

## Configuración de Despliegue en EasyPanel

### 1. Preparar Variables de Entorno

**En AWS Systems Manager → Parameter Store o en .env.local:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. Crear Aplicación en EasyPanel

1. Accede a EasyPanel en tu instancia EC2
2. Ve a **Applications** → **Add New Application**
3. Selecciona **Docker** como método de despliegue
4. Configura los siguientes valores:

| Campo | Valor |
|-------|-------|
| **Application Name** | premium-app |
| **Repository URL** | `https://github.com/misaduarte333-star/PremiumApp.git` |
| **Branch** | `master` |
| **Dockerfile Path** | `./Dockerfile` |
| **Container Port** | `3002` |
| **Public Port** | `3002` |
| **Restart Policy** | `unless-stopped` |

### 3. Configurar Variables de Entorno en EasyPanel

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NODE_ENV=production
```

### 4. Health Check

La aplicación expone `GET /api/health` en el puerto **3002**:
7. **Configurar el Webhook**:
   - En Easypanel, ve a la pestaña **General** del servicio.
   - Busca la sección **Deploy Webhook**.
   - Copia la URL que aparece.
   - Agrégala como un secreto llamado `EASYPANEL_WEBHOOK` en GitHub.

## 3. Flujo de Trabajo

1. Realizas cambios en tu código localmente.
2. Haces `git commit` y `git push origin main`.
3. GitHub Actions construirá la imagen y la subirá a GHCR.
4. Si configuraste el Webhook, Easypanel descargará la nueva imagen y reiniciará el contenedor automáticamente.

---

## Verificación de Salud

La app incluye un endpoint de salud en `/api/health` que puedes usar en la configuración de **Health Check** de Easypanel para asegurar que el tráfico solo se envíe cuando la app esté lista.
