# Roadmap - VGV Connect

Estados: `[x]` terminado | `[~]` parcial o MVP | `[ ]` pendiente
## Estado actual

VGV Connect cuenta con un flujo operativo conectado desde la planificación hasta la confirmación de entrega:
1. El planificador crea una ruta, asigna fecha, chofer, camión, origen, destino, peso y volumen.
2. La ruta recibe un nombre automático por fecha y correlativo diario: `Ruta DD-MM-AAAA / NNN`.
3. El planificador agrega puntos de descarga; cada punto puede contener su propia guía o documento.
4. El chofer consulta su ruta, registra resultado, evidencia fotográfica, ubicación GPS y observaciones.
5. Dashboard, entregas administrativas, reportes y paneles de choferes consumen la misma operación: entregas con una ruta asignada.

## Fase 1 - MVP operativo

### Backend y datos
- [x] API Express con autenticación JWT y roles: administrador, planificador, facturación y chofer.
- [x] Persistencia PostgreSQL con Prisma para usuarios, vehículos, rutas, entregas, eventos y auditoría.
- [x] Seed reproducible con usuarios, vehículos, rutas, guías, coordenadas, peso y volumen.
- [x] CRUD de rutas con creación, edición, asignación de chofer/camión y eliminación controlada.
- [x] Al eliminar una ruta, sus entregas se desasignan para permitir su reutilización sin contaminar las métricas operativas.
- [x] Estados validados para rutas y entregas.
- [x] Registro de auditoría para rutas, cambios de entrega y evidencia.
- [x] Subida de evidencia a Google Drive con fallback local de desarrollo.
- [x] Documentación OpenAPI/Swagger disponible en `/api-docs`.

### Planificador de rutas

- [x] Nombre automático por fecha y correlativo diario.
- [x] Fecha de planificación, fecha de entrega, hora de inicio, carga en kg y volumen en m3.
- [x] Edición de puntos de descarga dentro de un acordeón unificado.
- [x] Una ruta puede incluir varios puntos y varias guías/documentos en un mismo punto.
- [x] Confirmación antes de guardar cambios de ruta.
- [x] Filtro rápido por nombre de ruta, chofer, guía/documento, destino y fecha.
- [~] Optimización de ruta: cambia borrador a planificada; falta cálculo geográfico real.

### Operación de choferes

- [x] Dashboard personal con rutas, siguiente parada e historial.
- [x] Registro de entrega con estado, observaciones, GPS y evidencia.
- [x] Captura desde cámara integrada, adjuntar imagen de galería, vista previa, reemplazo y eliminación antes de enviar.
- [x] Validación de evidencia requerida antes de confirmar una entrega.
- [x] Panel administrativo de choferes con rutas, entregas, incidencias, peso y volumen.

### Administración y reportes

- [x] Dashboard operativo con indicadores consistentes de entregas asignadas a ruta.
- [x] Panel administrativo de entregas con búsqueda, filtro por estado, evidencia, ubicación, chofer, ruta e incidencias.
- [x] Diseño adaptable de entregas para escritorio y móvil.
- [x] Reporte de ejecución con cumplimiento, entregas activas, cobertura de evidencia, incidencias y carga por chofer.
- [x] Normalización compartida de estados en todos los paneles.
- [x] Cierre de sesión con confirmación y limpieza de sesión local.

## Fase 2 - Control operativo y calidad de datos

Objetivo: mejorar la toma de decisiones y reforzar validaciones de negocio.

### Prioridad inmediata

Antes de ampliar funciones, cerrar esta fase con reglas de negocio verificables, una base de datos versionada y pruebas ejecutables en cada cambio.

### Datos y reglas

- [ ] Validar carga de ruta contra capacidad máxima de peso y volumen del vehículo, con mensaje de capacidad disponible al planificador.
- [x] Transiciones permitidas: ruta `Borrador → Planificado → En progreso → Completado`; entrega `Pendiente/Planificado → En progreso → Completado, Rechazado o No encontrado`.
- [x] Vista separada de entregas sin asignar, con búsqueda y reasignación a rutas existentes.
- [x] Filtros de rango por fecha de creación, modificación y confirmación de entrega.
- [x] Migración inicial versionada de Prisma y comando `npm run db:migrate` para ambientes compartidos.
- [~] Pruebas de regresión para creación, edición, desasignación, borrado lógico y transiciones de ruta; falta cubrir los endpoints HTTP con una base de pruebas aislada.

### Operación

- [x] Historial filtrable de rutas y entregas por rango de fechas, chofer y zona.
- [x] Vista de evidencia con galería y trazabilidad de ubicación.
- [x] Exportación de reportes a CSV compatible con Excel e impresión/guardado en PDF.
- [x] Alertas operativas para entregas pendientes, rechazadas y no encontradas.
- [x] Filtros de zona/comuna y cliente.

### Criterio de cierre de fase

- [ ] Una ruta no puede superar peso ni volumen de su vehículo.
- [ ] Las pruebas API cubren autenticación, permisos, estados, creación, edición y eliminación de rutas.
- [ ] La migración se puede aplicar desde cero y en una base compartida sin usar `db:push`.
- [ ] Los paneles muestran los mismos totales para el mismo rango y filtros operativos.

## Fase 3 - Geolocalización y optimización

Objetivo: usar ubicación y carga para planificar y controlar recorridos en terreno.
- [ ] Integración con Google Maps Directions API u otro proveedor de rutas.
- [ ] Ordenamiento automático de puntos por distancia, tiempo y ventanas de entrega.
- [ ] Cálculo de distancia, ETA y desvíos por ruta.
- [ ] Seguimiento GPS periódico del chofer durante una ruta activa.
- [ ] Mapa operativo con posiciones de vehículos y alertas de atraso.
- [ ] Geocodificación confiable y validación de direcciones al crear puntos.

### Criterio de cierre de fase

- [ ] Cada ruta planificada tiene puntos geocodificados válidos y distancia estimada.
- [ ] El planificador puede comparar el orden manual con una propuesta optimizada antes de confirmarla.
- [ ] Dashboard muestra ETA, desvíos y alertas basadas en ubicación real, no datos simulados.

## Fase 4 - Producto móvil y empresarial

Objetivo: soportar operación en terreno sin depender del navegador de escritorio.
- [ ] PWA para choferes con sesión persistente y captura de cámara confiable.
- [ ] Modo offline para captura de entregas, fotos y ubicación.
- [ ] Sincronización segura cuando el dispositivo recupere conectividad.
- [ ] Notificaciones para chofer, administración y cliente.
- [ ] Backups automáticos, monitoreo, rate limiting, CORS restringido, secretos fuera del repositorio y endurecimiento de seguridad.
- [x] Documentación OpenAPI/Swagger; pendiente definir estrategia de despliegue para backend y frontend.

### Preparación para producción

1. Definir ambientes `development`, `staging` y `production`, cada uno con su propia base PostgreSQL y variables de entorno.
2. Baseline de Prisma: validar la migración inicial en una base vacía y reconciliar la base local existente antes de usar `prisma migrate deploy` en ambientes compartidos.
3. Automatizar CI: instalar dependencias, ejecutar `npm test`, `prisma validate`, `npm run lint` y `npm run build` en cada pull request.
4. Desplegar backend y PostgreSQL en staging, con URL HTTPS, logs centralizados, respaldos diarios y monitoreo de errores.
5. Desplegar frontend contra staging y ejecutar una prueba de aceptación completa: login, creación de ruta, asignación, entrega con foto/GPS, reporte y exportación.
6. Hacer una prueba piloto con choferes reales antes de habilitar producción general.

### Demo Railway

- [x] Configuración monorepo para Railway: backend con healthcheck, migraciones y CORS configurable; frontend con URL de API por variable de entorno.
- [ ] Crear servicios Railway, asignar PostgreSQL y variables de entorno, y ejecutar la prueba de aceptación en la URL pública.

### Criterio de salida a producción

- [ ] CI en verde para backend y frontend.
- [ ] Migraciones aplicadas únicamente por `prisma migrate deploy`.
- [ ] Credenciales de desarrollo eliminadas o rotadas y secretos administrados por el entorno.
- [ ] Backup restaurado exitosamente en una prueba controlada.
- [ ] Flujo operativo de punta a punta aprobado en staging por administración y choferes piloto.