# Despliegue en Render - Vgv Connect TMS

Esta guía deja el proyecto listo para desplegar en Render con frontend PWA, backend Express y PostgreSQL.

## Arquitectura recomendada

```text
Render
├─ Static Site: vgv-connect-web
├─ Web Service: vgv-connect-api
└─ PostgreSQL: vgv-connect-db
```

## Orden de creación

1. Crear la base **Postgres**.
2. Crear el backend como **Web Service**.
3. Crear el frontend como **Static Site**.
4. Configurar variables cruzadas entre frontend y backend.
5. Probar salud, login, rutas, conductor, check vehículo y fotos.

## Opción A: Blueprint con render.yaml

El repo incluye `render.yaml`. En Render puedes usar **Blueprint** para crear:

- `vgv-connect-api`
- `vgv-connect-web`
- `vgv-connect-db`

Después del primer deploy debes completar manualmente las variables marcadas como `sync: false`.

## Opción B: Configuración manual

### 1. PostgreSQL

Crear un servicio **New Postgres**.

Valores sugeridos:

| Campo | Valor |
| --- | --- |
| Name | `vgv-connect-db` |
| Database | `vgv_connect` |
| User | `vgv_connect` |
| Region | La misma región del backend |

Usa la **Internal Database URL** para el backend cuando ambos servicios estén en Render.

### 2. Backend

Crear **New Web Service** conectado al repositorio.

| Campo | Valor |
| --- | --- |
| Name | `vgv-connect-api` |
| Root Directory | `backend` |
| Runtime | `Node` |
| Build Command | `npm ci && npm run db:generate` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Variables del backend:

| Variable | Valor |
| --- | --- |
| `NODE_VERSION` | `20` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Internal Database URL de Render Postgres |
| `JWT_SECRET` | Secreto largo generado por Render o manual |
| `ENABLE_DEMO_USERS` | `false` |
| `CORS_ORIGINS` | URL pública del frontend, ejemplo `https://vgv-connect-web.onrender.com` |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de carpeta Drive para evidencias |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo de cuenta de servicio |
| `MAX_PHOTO_BYTES` | `5242880` |

### 3. Frontend

Crear **New Static Site** conectado al mismo repositorio.

| Campo | Valor |
| --- | --- |
| Name | `vgv-connect-web` |
| Root Directory | `VGVConnect-react` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

Variable del frontend:

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | URL pública del backend, ejemplo `https://vgv-connect-api.onrender.com` |

Agregar rewrite SPA si lo haces manualmente:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

## Google Drive para fotos

El backend guarda fotos de entregas y check vehículo mediante Google Drive si están configuradas estas variables:

```text
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_SERVICE_ACCOUNT_JSON={...}
```

Recomendaciones:

- Crear una cuenta de servicio en Google Cloud.
- Compartir la carpeta de Drive con el email de la cuenta de servicio.
- Dar permiso de editor solo en esa carpeta.
- Guardar el JSON completo como variable secreta en Render.
- No subir el JSON al repositorio.

## Validaciones después del deploy

Backend:

```text
https://vgv-connect-api.onrender.com/health
https://vgv-connect-api.onrender.com/api-docs
```

Frontend:

```text
https://vgv-connect-web.onrender.com
https://vgv-connect-web.onrender.com/conductor
https://vgv-connect-web.onrender.com/conductor/check-vehiculo
```

Pruebas funcionales mínimas:

1. Login admin.
2. Login conductor.
3. Crear o editar conductor.
4. Crear ruta de entrega.
5. Crear ruta de retiro.
6. Registrar entrega con foto.
7. Registrar check vehículo con foto del tablero.
8. Revisar auditoría.

## Hacks sanos para maximizar rendimiento/costo en Render

### Elegir bien el plan

- Para demo o baja carga, usar plan económico en backend y Postgres.
- Evitar plan gratuito para operación real si hay conductores en terreno, porque el backend puede dormir y el primer login será lento.
- Si se usa plan gratuito, avisar que el primer acceso puede tardar por cold start.

### Misma región para backend y base

Backend y Postgres deben estar en la misma región. Esto reduce latencia en cada consulta Prisma.

### Frontend como Static Site

El frontend debe ir como **Static Site**, no como Web Service. Render lo sirve desde CDN y cuesta menos.

### Cache agresivo solo para assets versionados

`render.yaml` define:

```text
/assets/* -> Cache-Control: public, max-age=31536000, immutable
/sw.js -> no-cache
/manifest.webmanifest -> no-cache
```

Esto hace que JS/CSS versionados carguen rápido, pero permite actualizar PWA/service worker sin quedar pegado a versiones antiguas.

### Mantener liviano el backend

- No servir el frontend desde Express.
- No guardar imágenes base64 en la base si Drive está configurado.
- Limitar tamaño de fotos con `MAX_PHOTO_BYTES`.
- Mantener `/health` simple y rápido.

### Base de datos

- Usar la Internal Database URL desde Render.
- Activar backups si el sistema se usa en operación real.
- Evitar ejecutar seed en producción salvo carga inicial controlada.
- Mantener `ENABLE_DEMO_USERS=false`.

### Prisma

- `npm start` ya ejecuta `prisma migrate deploy` antes de iniciar el servidor.
- No usar `prisma db push` en producción.
- Cada cambio de modelo debe ir con migración versionada.

### PWA móvil

- Render entrega HTTPS, requisito para instalación móvil.
- Probar instalación en Android/Chrome y iOS/Safari.
- Mantener `VITE_API_URL` apuntando al backend HTTPS público.
- Después de cambios en `sw.js`, pedir recarga dura o cerrar/abrir la PWA si queda cache antiguo.

### Google Drive

- Usar una carpeta dedicada para evidencias.
- No mezclar evidencias con documentos personales.
- Revisar permisos de visualización: si los links no abren desde el dashboard, ajustar permisos de la carpeta o del archivo creado.

## Checklist previo a producción

- `JWT_SECRET` configurado y largo.
- `ENABLE_DEMO_USERS=false`.
- `CORS_ORIGINS` solo con dominio del frontend.
- `DATABASE_URL` usando Postgres de Render.
- `VITE_API_URL` usando backend HTTPS.
- `GOOGLE_DRIVE_FOLDER_ID` configurado.
- `GOOGLE_SERVICE_ACCOUNT_JSON` configurado como secreto.
- `MAX_PHOTO_BYTES=5242880`.
- `/health` responde.
- `/api-docs` responde.
- PWA instalable en teléfono.
