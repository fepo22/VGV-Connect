# VGV Connect

Plataforma logística para administrar rutas, entregas y operación de choferes.

## Estructura

- `backend/`: API Node.js + Express.
- `VGVConnect-react/`: frontend React + Vite.
- `roadmap.md`: estado y próximos hitos del proyecto.

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalación

Desde la raíz del proyecto:

```powershell
cd backend
npm install

cd ..\VGVConnect-react
npm install
```

## Levantar servicios

Backend:

```powershell
cd backend
npm.cmd run dev
```

Disponible en `http://localhost:4000`.

Frontend, en otra terminal:

```powershell
cd VGVConnect-react
npm.cmd run dev
```

Disponible en `http://localhost:5173`.

## Usuarios de prueba

El MVP usa usuarios temporales en memoria. El login se realiza con usuario y contraseña.

| Usuario | Nombre | Rol | Contraseña | Módulo principal |
| --- | --- | --- | --- | --- |
| `admin` | Administrador | `admin` | `admin123` | Dashboard y administración |
| `programador` | Programador | `route_planner` | `programador123` | Planificador de rutas |
| `faturacion` | Yessica | `billing` | `faturacion123` | Reportes |
| `nalvarez` | Nicolas Alvarez | `driver` | `nalvarez123` | Dashboard de chofer |
| `acampos` | Alejandro Campos | `driver` | `acampos123` | Dashboard de chofer |
| `msolis` | Mauricio Solis | `driver` | `msolis123` | Dashboard de chofer |
| `rtito` | Roberto Saavedra | `driver` | `rtito123` | Dashboard de chofer |
| `lseal` | Luis Seal | `driver` | `lseal123` | Dashboard de chofer |
| `ltorres` | Luis Torres | `driver` | `ltorres123` | Dashboard de chofer |
| `Tsantos` | Tolentino Santos | `driver` | `tsantos123` | Dashboard de chofer |

## Flujo principal

1. Administración o planificación crea y asigna una ruta.
2. El planificador selecciona las entregas e ingresa manualmente el N° de guía de despacho de cada una.
3. La ruta queda vinculada a un camión, chofer y sus entregas.
4. El chofer consulta sus rutas y entregas asignadas.
5. El chofer registra estado, foto, ubicación GPS y observaciones.
6. El dashboard y la auditoría reflejan los cambios.

## Validación

```powershell
cd VGVConnect-react
npm.cmd run lint
npm.cmd run build
```

## Configuración opcional

Copia `backend/.env.example` a `backend/.env` y configura `DATABASE_URL` de PostgreSQL junto con:

- `JWT_SECRET`: secreto para firmar tokens.
- `DATABASE_URL`: conexión PostgreSQL para la futura persistencia.
- `GOOGLE_DRIVE_FOLDER_ID`: carpeta de destino para evidencias.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: credenciales de la cuenta de servicio de Google Drive.

## Base de datos y datos de prueba

Con PostgreSQL disponible y `DATABASE_URL` configurado:

```powershell
cd backend
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:seed
```

El seed genera un escenario operativo reproducible con:

- 200 guías de despacho.
- 14 rutas distribuidas entre los 7 choferes.
- 7 camiones con patentes y capacidades de peso/volumen.
- Direcciones, comunas, regiones y coordenadas variadas.
- Pesos, volúmenes, estados y distancias diferentes para preparar optimización de carga.

El seed limpia el dataset operativo (`routes`, `deliveries`, eventos y auditoría) antes de cargarlo nuevamente. Conserva los usuarios y contraseñas definidos en el seed.

## Estado del MVP

- La autenticación usa JWT, pero los usuarios todavía están definidos en memoria.
- Rutas, entregas, usuarios, vehículos, eventos y auditoría se almacenan en PostgreSQL cuando `DATABASE_URL` está configurado.
- El catálogo MVP de vehículos ya contempla patente, peso máximo y volumen máximo para futuras reglas de carga.
- Cada entrega usa un número de guía de despacho (`guideNumber`) y queda vinculada a su ruta y camión.
- Google Drive usa un fallback local si no hay credenciales configuradas.
- PostgreSQL, usuarios persistentes, permisos completos e integraciones productivas quedan definidos en `roadmap.md`.

> Las credenciales incluidas son solo para desarrollo. Deben cambiarse y almacenarse de forma segura antes de publicar el sistema.

## Demo en Railway

Despliega tres servicios dentro de un proyecto Railway:

1. Crea una base PostgreSQL y despliega el repositorio desde la raíz. El `railway.toml` principal instala e inicia el servicio de `backend/` automáticamente.
2. Configura `DATABASE_URL` desde el plugin PostgreSQL, `JWT_SECRET` seguro y `CORS_ORIGINS` con la URL pública del frontend.
3. Railway ejecuta `npm start`, que aplica `prisma migrate deploy` antes de iniciar el API. Verifica `https://TU-BACKEND/health` y `https://TU-BACKEND/api-docs/`.
4. Crea el servicio frontend con raíz `VGVConnect-react/` y define `VITE_API_URL=https://TU-BACKEND` antes del build.
5. En backend, actualiza `CORS_ORIGINS` con la URL final del frontend y redepliega. Para la demo, omite las variables de Google Drive si usarás el fallback local.
