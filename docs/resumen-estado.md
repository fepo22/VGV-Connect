# Resumen de estado - VGV Connect

Fecha: 2026-09-01

## Estado general

VGV Connect cuenta con frontend React/Vite, backend Node.js/Express y persistencia PostgreSQL mediante Prisma. El sistema ya cubre autenticación por roles, planificación de rutas, administración de entregas, panel de conductores, reportes, auditoría operativa y documentación técnica inicial.

## Módulos principales

| Módulo | Estado | Descripción |
| --- | --- | --- |
| Login y autenticación | Implementado | Inicio de sesión con JWT y redirección por rol. |
| Dashboard operativo | Implementado | Vista de KPIs, operación y seguimiento general. |
| Entregas | Implementado | Administración, filtros, estados, evidencia y seguimiento. |
| Rutas | En mejora | Vista general con submódulos para entregas y retiros. |
| Rutas / Entregas | Implementado | Programación de rutas de entrega a clientes. |
| Rutas / Retiros | Implementado | Programación de rutas para retiro de mercadería/compras. |
| Conductores | Implementado | Administración y resumen operativo de conductores. |
| Panel conductor | En mejora | Vista móvil para rutas asignadas y registro de entregas. |
| Check vehículo | Implementado | Checklist preoperacional persistido en backend con odómetro, vehículo, foto del tablero y auditoría. |
| Reportes | Implementado | Métricas por período, conductor y desempeño operativo. |
| PWA conductor | Base implementada | App instalable orientada al módulo móvil de conductor. |

## Cambios recientes

### Rutas

- Se incorporó un submenú bajo **Rutas** con:
  - **Entregas**
  - **Retiros**
- `/rutas` funciona como vista general y muestra información rápida de ambos submódulos.
- `/rutas/entregas` filtra rutas de entrega a clientes.
- `/rutas/retiros` filtra rutas de retiro de mercadería/compras.
- El backend distingue tipos de ruta mediante `documentType`:
  - `delivery`
  - `pickup`
- Se mantiene compatibilidad con rutas antiguas `documentType: "route"`, tratándolas como entregas.

### Panel conductor

- La ruta visible principal cambió de `/chofer` a `/conductor`.
- Se mantienen redirecciones de compatibilidad desde `/chofer`.
- El menú del conductor incluye:
  - **Mis entregas**
  - **Check vehículo**

### Check vehículo

- Se agregó una pantalla para control preoperacional del vehículo.
- El conductor puede seleccionar el camión/patente a revisar.
- El formulario incluye odómetro inicial.
- Se agregó carga o captura de fotografía del tablero para respaldar el kilometraje.
- El checklist cubre:
  - Documentación
  - Seguridad obligatoria
  - Condición del vehículo
  - Carga y operación
- El check se guarda en backend con relación a conductor, vehículo y fecha.
- El registro incluye estados por ítem, observaciones, odómetro y foto del tablero.
- Las fotos se almacenan en Google Drive cuando el backend tiene configurados `GOOGLE_DRIVE_FOLDER_ID` y `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Cada creación o actualización queda registrada en auditoría.
- El navegador conserva una copia local como respaldo operativo si falla la conexión.

### PWA conductor

- Se agregó manifest de PWA con inicio en `/conductor`.
- Se incorporó service worker básico.
- Se agregó página offline simple.
- Se configuraron metadatos móviles para instalación.
- La PWA incluye accesos rápidos a:
  - Mis entregas
  - Check vehículo

## Validaciones realizadas

Se ejecutaron validaciones de frontend y backend durante el desarrollo:

```bash
npm --prefix backend test
npm --prefix VGVConnect-react run lint
npm --prefix VGVConnect-react run build
```

Resultado: las validaciones pasaron correctamente en el estado revisado.

## Riesgos y brechas actuales

| Prioridad | Riesgo | Impacto | Recomendación |
| --- | --- | --- | --- |
| Alta | Usuarios demo en bootstrap | Puede recrear conductores en bases vacías | Desactivar demo users por defecto en producción. |
| Alta | `JWT_SECRET` con fallback | Riesgo de tokens firmados con secreto conocido | Exigir secreto obligatorio en producción. |
| Alta | Vulnerabilidades npm audit | Dependencias con alertas high | Ejecutar `npm audit fix` y probar regresión. |
| Media | Service worker cachea GET same-origin | Podría cachear datos sensibles si API comparte origen | Excluir endpoints API del cache. |
| Media | Acceso a fotos en Drive | Los enlaces dependen de permisos de la carpeta/archivos en Google Drive | Definir política de uso compartido de evidencias. |
| Media | Login sin rate limit | Exposición a fuerza bruta | Agregar rate limiting por IP/usuario. |

## Despliegue Render y fotos

Se agregó `render.yaml` para desplegar en Render con tres recursos:

- Backend `vgv-connect-api`.
- Frontend estático `vgv-connect-web`.
- PostgreSQL `vgv-connect-db`.

La guía operativa completa está en [despliegue-render.md](despliegue-render.md).

Variables clave del backend en Render:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL desde Render. |
| `JWT_SECRET` | Firma de tokens. |
| `ENABLE_DEMO_USERS=false` | Evita inicializar usuarios demo en producción. |
| `CORS_ORIGINS` | URL pública del frontend Render. |
| `GOOGLE_DRIVE_FOLDER_ID` | Carpeta de Google Drive donde se almacenan fotos de entregas y check vehículo. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON de cuenta de servicio con permisos sobre la carpeta de Drive. |
| `MAX_PHOTO_BYTES` | Límite de tamaño por foto. Valor sugerido: `5242880`. |

Variable clave del frontend:

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL pública del backend Render. |

## Próximas mejoras recomendadas

1. Completar modo offline de la PWA:
   - Cola local de checks pendientes.
   - Sincronización cuando vuelva la conexión.
   - Indicadores claros de pendiente/sincronizado.

2. Endurecer seguridad:
   - `JWT_SECRET` obligatorio.
   - Rate limit en login.
   - Demo users solo con flag explícito.
   - Validación estricta de uploads.

3. Mejorar datos de rutas:
   - Convertir `documentType` a enum controlado.
   - Migrar rutas antiguas `route` a `delivery`.
   - Agregar pruebas para filtros de rutas por tipo.

4. Agregar cobertura de pruebas:
   - Tests backend para conductores, rutas por tipo y checks de vehículo.
   - Smoke tests frontend para `/conductor`, `/conductor/check-vehiculo`, `/rutas`, `/rutas/entregas` y `/rutas/retiros`.

## URLs principales

| Vista | URL |
| --- | --- |
| Login | `/` |
| Dashboard | `/dashboard` |
| Entregas | `/entregas` |
| Rutas general | `/rutas` |
| Rutas de entrega | `/rutas/entregas` |
| Rutas de retiro | `/rutas/retiros` |
| Conductores | `/choferes` |
| Panel conductor | `/conductor` |
| Check vehículo | `/conductor/check-vehiculo` |
| Reportes | `/reportes` |

## Nota operativa

Para instalar la PWA en teléfonos móviles debe desplegarse por HTTPS. En desarrollo local funciona sobre `localhost`, pero en producción conviene revisar configuración de cache, service worker y persistencia antes de dejarla como herramienta operativa oficial.
