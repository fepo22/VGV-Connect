
🛣️ ROADMAP OFICIAL - VGV CONNECT

Estados: [x] terminado | [~] MVP o parcial | [ ] pendiente

## Estado actual

- [~] Backend Express operativo con autenticación JWT, roles, rutas, entregas y auditoría en memoria.
- [~] Frontend React/Vite con Dashboard, planificador administrativo y flujo de chofer.
- [~] Entregas vinculadas a rutas y choferes, con estados, observaciones, GPS y evidencia.
- [~] Guías de despacho y patentes de camión modeladas; capacidades de peso y volumen preparadas.
- [ ] Persistencia PostgreSQL y usuarios reales.
- [ ] Integración productiva con Google Drive y Google Maps.

### Backend
[x] API base de auth, rutas, entregas y auditoría

[~] JWT + roles Admin y Chofer; falta persistencia y permisos completos de Operaciones

[~] Subida de evidencia preparada para Google Drive con fallback local

[~] Esquema PostgreSQL/Prisma preparado para usuarios, vehículos, rutas, guías, entregas y auditoría

[ ] Migrar datos mock a PostgreSQL y ejecutar migraciones

[~] Auditoría y manejo básico de errores en memoria

### Frontend
[x] Login con sesión local y roles

[x] Planificador de rutas: creación, asignación, paradas, estados y optimización MVP

[x] Flujo de chofer: entregas asignadas, estado, foto, GPS y observaciones

[x] Dashboard central y dashboard personal del chofer

[~] Reportes con métricas básicas; faltan filtros e históricos

### Infraestructura
[x] `.env.example` para JWT y Google Drive

[ ] Deploy inicial backend (VPS o cloud)

[ ] Deploy frontend (Netlify / Vercel / cPanel)

Fase 2 — Optimización Operativa (2–4 meses)
Objetivo: Mejorar la eficiencia del flujo operativo y la experiencia del chofer.

### Backend
[ ] Endpoints para métricas avanzadas

[ ] Cache de KPIs (Redis opcional)

[x] Validaciones de estados, permisos y transiciones de entregas

### Frontend
[ ] Dashboard gerencial completo

[ ] Filtros avanzados (por chofer, zona, fecha)

[ ] Historial de rutas y entregas

[ ] Vista de fotos por entrega

🔹 UX / UI
[ ] Rediseño visual del módulo de chofer

[x] Flujo simplificado de “marcar entrega”

Fase 3 — App Móvil para Choferes (4–8 meses)
Objetivo: Independizar al chofer del navegador y mejorar la captura de datos.

### App Móvil (Flutter)
[ ] Login + sesión persistente

[ ] Ver rutas asignadas

[ ] Ver entregas del día

[ ] Tomar fotos desde la cámara

[ ] Subir fotos a Drive vía backend

[ ] Marcar entrega (entregado, rechazado, no encontrado)

[ ] Guardado offline (modo sin señal)

### Backend
[ ] Endpoints optimizados para móvil

[ ] Sincronización offline → online

[x] Registro de GPS al momento de entrega en el flujo web

Fase 4 — Inteligencia Operacional (8–12 meses)
Objetivo: Convertir VGV Connect en una plataforma inteligente.

🔹 Optimización de rutas
[ ] Integración con Google Maps Directions API

[ ] Cálculo automático de ruta óptima

[ ] Estimación de tiempos de llegada (ETA)

🔹 Geolocalización en tiempo real
[ ] Tracking GPS del chofer

[ ] Mapa en dashboard con ubicación de vehículos

[ ] Alertas de atraso

🔹 Notificaciones
[ ] Notificación a cliente cuando su entrega está en camino

[ ] Notificación interna de entregas atrasadas

[ ] Notificación de cierre de ruta

🔹 Reportería avanzada
[ ] Reportes PDF/Excel

[ ] Ranking de choferes

[ ] Tiempos promedio por zona

[ ] Costos por ruta

🧱 Roadmap Técnico (por capas)
Frontend
[ ] Migración a diseño modular

[ ] Componentes reutilizables

[ ] Manejo global de estado (Zustand o Redux)

[ ] PWA para modo offline en navegador

Backend
[ ] Refactor a arquitectura limpia (controllers → services → repositories)

[ ] Tests unitarios (Jest)

[ ] Documentación Swagger

[ ] Rate limiting y seguridad avanzada

Base de datos
[ ] Índices para acelerar consultas

[ ] Auditoría de cambios

[ ] Backups automáticos

🏁 Fase Final — Producto Empresarial Completo
Cuando completes este roadmap, VGV Connect será:

Una plataforma logística completa

Con app móvil

Con dashboard gerencial

Con optimización de rutas

Con tracking en tiempo real

Con reportes avanzados

Con arquitectura profesional y escalable