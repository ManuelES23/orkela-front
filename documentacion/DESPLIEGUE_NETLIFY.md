# 🚀 Despliegue de Orkela Frontend en Netlify

## 📋 Requisitos Previos

1. **Cuenta en Netlify** - Crea una en [netlify.com](https://www.netlify.com/)
2. **Repositorio en GitHub/GitLab/Bitbucket** con el código del frontend
3. **Backend desplegado** con una URL pública accesible

---

## 🛠️ Paso 1: Preparar el Proyecto

### 1.1 Verificar archivos de configuración

Asegúrate de tener estos archivos en tu proyecto:

```
orkela-front/
├── netlify.toml          ✅ Configuración de Netlify
├── .env.example          ✅ Ejemplo de variables de entorno
├── package.json          ✅ Scripts de build
└── vite.config.js        ✅ Configuración de Vite
```

### 1.2 Verificar package.json

Tu `package.json` debe tener el script de build:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 1.3 Probar build localmente

```bash
cd orkela-front
npm install
npm run build
```

Esto debe crear una carpeta `dist/` con los archivos compilados.

---

## 🌐 Paso 2: Desplegar en Netlify

### Opción A: Desde la Interfaz Web (Recomendado para principiantes)

#### 2.1 Conectar repositorio

1. Inicia sesión en [app.netlify.com](https://app.netlify.com/)
2. Haz clic en **"Add new site"** > **"Import an existing project"**
3. Selecciona tu proveedor de Git (GitHub, GitLab, Bitbucket)
4. Autoriza Netlify si es necesario
5. Selecciona el repositorio `orkela-front`

#### 2.2 Configurar build

En la pantalla de configuración:

| Campo | Valor |
|-------|-------|
| **Branch to deploy** | `main` (o tu rama principal) |
| **Base directory** | *(dejar vacío si el repo solo tiene el frontend)* |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

#### 2.3 Configurar Variables de Entorno

**¡IMPORTANTE!** Antes de hacer deploy, configura las variables de entorno:

1. Haz clic en **"Show advanced"**
2. En **"Environment variables"**, agrega:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `VITE_API_URL` | `https://tu-backend.com/api` | URL de tu API backend |
| `VITE_REVERB_APP_KEY` | `dgczpergxfxyiffhkzvr` | Key de Reverb |
| `VITE_REVERB_HOST` | `tu-backend.com` | Host del WebSocket |
| `VITE_REVERB_PORT` | `6001` | Puerto de Reverb |
| `VITE_REVERB_SCHEME` | `https` | Usar `https` en producción |
| `VITE_APP_NAME` | `Orkela` | Nombre de la app |

3. Haz clic en **"Deploy site"**

---

### Opción B: Desde CLI (Para usuarios avanzados)

#### 2.1 Instalar Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2.2 Login en Netlify

```bash
netlify login
```

#### 2.3 Inicializar proyecto

```bash
cd orkela-front
netlify init
```

Sigue las instrucciones:
- **Create & configure a new site**
- **Team**: Selecciona tu equipo
- **Site name**: `orkela-app` (o el nombre que prefieras)

#### 2.4 Configurar variables de entorno

```bash
netlify env:set VITE_API_URL "https://tu-backend.com/api"
netlify env:set VITE_REVERB_APP_KEY "dgczpergxfxyiffhkzvr"
netlify env:set VITE_REVERB_HOST "tu-backend.com"
netlify env:set VITE_REVERB_PORT "6001"
netlify env:set VITE_REVERB_SCHEME "https"
netlify env:set VITE_APP_NAME "Orkela"
```

#### 2.5 Desplegar

```bash
# Build y deploy
netlify deploy --prod
```

---

## ⚙️ Paso 3: Configurar Dominio Personalizado (Opcional)

### 3.1 Agregar dominio

1. Ve a **Site settings** > **Domain management**
2. Haz clic en **"Add custom domain"**
3. Ingresa tu dominio (ej: `app.tuempresa.com`)
4. Sigue las instrucciones para verificar propiedad

### 3.2 Configurar DNS

Agrega estos registros en tu proveedor de DNS:

**Para dominio raíz (tuempresa.com):**
```
Tipo: A
Host: @
Valor: 75.2.60.5
```

**Para subdominio (app.tuempresa.com):**
```
Tipo: CNAME
Host: app
Valor: tu-sitio.netlify.app
```

### 3.3 Habilitar HTTPS

Netlify provee certificados SSL gratis con Let's Encrypt:

1. Ve a **Site settings** > **Domain management** > **HTTPS**
2. Haz clic en **"Verify DNS configuration"**
3. Haz clic en **"Provision certificate"**

---

## 🔧 Paso 4: Configurar Backend para CORS

Tu backend Laravel debe permitir requests desde el dominio de Netlify.

### 4.1 Editar config/cors.php en el backend

```php
<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],
    
    'allowed_methods' => ['*'],
    
    'allowed_origins' => [
        'http://localhost:5173',           // Desarrollo local
        'http://localhost:5174',           // Desarrollo local (alternativo)
        'https://tu-sitio.netlify.app',    // Netlify
        'https://app.tuempresa.com',       // Tu dominio personalizado
    ],
    
    'allowed_origins_patterns' => [],
    
    'allowed_headers' => ['*'],
    
    'exposed_headers' => [],
    
    'max_age' => 0,
    
    'supports_credentials' => true,
];
```

### 4.2 Limpiar caché del backend

```bash
php artisan config:cache
php artisan route:cache
```

---

## 🔄 Paso 5: Despliegues Automáticos

### Configurar Auto-Deploy

Netlify automáticamente hace deploy cuando:
- Haces push a la rama `main`
- Mergeas un Pull Request

### Deploy Previews

Para cada Pull Request, Netlify crea un preview único:
- URL: `deploy-preview-123--tu-sitio.netlify.app`
- Perfecto para revisar cambios antes de mergear

---

## 📊 Paso 6: Monitoreo y Analytics

### Ver logs de deploy

1. Ve a **Deploys** en tu dashboard
2. Haz clic en cualquier deploy para ver los logs

### Netlify Analytics (Opcional - Pago)

- Ve a **Analytics** para ver métricas de visitas
- Incluye page views, unique visitors, etc.

---

## 🐛 Solución de Problemas

### Error: "Page Not Found" en rutas

**Síntoma**: Al recargar una página como `/projects`, muestra 404.

**Solución**: Verifica que `netlify.toml` tenga el redirect para SPA:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Error: "CORS blocked"

**Síntoma**: La API no responde y la consola muestra error de CORS.

**Solución**: 
1. Verifica `VITE_API_URL` en Netlify
2. Agrega el dominio de Netlify a `config/cors.php` en el backend
3. Limpia caché: `php artisan config:cache`

### Error: "WebSocket connection failed"

**Síntoma**: Las notificaciones en tiempo real no funcionan.

**Solución**:
1. Verifica que las variables `VITE_REVERB_*` estén configuradas
2. Asegúrate de que Reverb esté corriendo en el servidor
3. Para producción, usa `VITE_REVERB_SCHEME=https`

### Build falla en Netlify

**Síntoma**: El deploy falla durante el build.

**Solución**:
1. Revisa los logs del deploy
2. Prueba el build localmente: `npm run build`
3. Verifica que todas las dependencias estén en `package.json`
4. Limpia caché de Netlify: **Deploys** > **Trigger deploy** > **Clear cache and deploy site**

### Variables de entorno no funcionan

**Síntoma**: `import.meta.env.VITE_API_URL` es `undefined`.

**Solución**:
1. Las variables de Vite DEBEN empezar con `VITE_`
2. Después de cambiar variables, haz un nuevo deploy
3. Verifica en **Site settings** > **Environment variables**

---

## 📝 Checklist de Despliegue

```
✅ Código subido a Git
✅ Build funciona localmente (npm run build)
✅ netlify.toml configurado
✅ Variables de entorno configuradas en Netlify
✅ Backend permite CORS desde Netlify
✅ Reverb/WebSocket configurado (si usas notificaciones en tiempo real)
✅ HTTPS habilitado
✅ Probado login y funcionalidades principales
```

---

## 🔗 URLs de Ejemplo

| Ambiente | URL |
|----------|-----|
| Netlify (temporal) | `https://random-name-123.netlify.app` |
| Netlify (personalizado) | `https://orkela.netlify.app` |
| Dominio propio | `https://app.tuempresa.com` |

---

## 📚 Recursos Adicionales

- [Documentación de Netlify](https://docs.netlify.com/)
- [Vite - Deploying](https://vitejs.dev/guide/static-deploy.html#netlify)
- [Variables de entorno en Vite](https://vitejs.dev/guide/env-and-mode.html)

---

**¡Listo!** Tu frontend de Orkela debería estar desplegado en Netlify. 🎉
