# Despliegue en AWS EC2 con EasyPanel de PremiumApp

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

1. Accede a EasyPanel en tu instancia EC2.
2. Ve a **Applications** → **Add New Application**.
3. Selecciona **Docker Image** (Recomendado para mayor velocidad y menor carga en el servidor).
4. Configura los siguientes valores:

| Campo | Valor |
|-------|-------|
| **Application Name** | premium-app |
| **Docker Image** | `ghcr.io/misaduarte333-star/premiumapp:latest` |
| **Container Port** | `3002` |
| **Public Port** | `3002` |
| **Restart Policy** | `unless-stopped` |

> [!NOTE]
> Si prefieres que EasyPanel construya la imagen desde el código, selecciona **Git Repository** y usa la URL del repo, pero el método de **Docker Image** es más eficiente ya que GitHub Actions hace el trabajo pesado.

### 3. Configurar Variables de Entorno en EasyPanel

En la sección **Environment**, agrega las variables de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NODE_ENV=production
```

### 4. Configurar el Webhook de Despliegue Automático

Para que EasyPanel se actualice solo al hacer push:
1. En EasyPanel, ve a la pestaña **General** de tu aplicación.
2. Busca la sección **Deploy Webhook**.
3. Copia la URL.
4. En GitHub, ve a **Settings** → **Secrets and variables** → **Actions**.
5. Crea un nuevo secreto llamado `EASYPANEL_WEBHOOK` y pega la URL.

## 3. Flujo de Trabajo Automatizado

1. Realizas cambios en tu código localmente.
2. Haces `git commit` y `git push origin master`.
3. **GitHub Actions** se activará automáticamente:
   - Construirá la imagen Docker (inyectando las variables de build si es necesario).
   - Subirá la imagen a **GitHub Container Registry (GHCR)**.
   - Llamará al Webhook de EasyPanel.
4. **EasyPanel** recibirá la notificación, descargará la nueva imagen y reiniciará el contenedor automáticamente.

---

## Verificación de Salud

La app incluye un endpoint de salud en `/api/health` que puedes usar en la configuración de **Health Check** de Easypanel para asegurar que el tráfico solo se envíe cuando la app esté lista.
