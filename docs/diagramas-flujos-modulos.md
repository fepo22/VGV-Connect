# Diagramas de flujos de trabajo y módulos

Este documento resume los flujos principales de VGV Connect y la relación entre módulos de frontend, backend y base de datos.

## Vista general de módulos

```mermaid
flowchart LR
  Usuario[Usuarios del sistema] --> Frontend[Frontend React + Vite]

  subgraph FrontendModules[Frontend]
    Login[Login]
    Layout[Layout, Navbar y Sidebar]
    Home[Home]
    Dashboard[Dashboard operativo]
    Entregas[Administración de entregas]
    Rutas[Planificador de rutas]
    Conductores[Conductores]
    Reportes[Reportes]
    Conductor[Panel de conductor]
    CheckVehiculo[Check vehículo]
  end

  Frontend --> FrontendModules
  FrontendModules --> ApiClient[API clients Axios]

  ApiClient --> Backend[Backend Express]

  subgraph BackendModules[Backend]
    AuthAPI[/auth]
    DeliveriesAPI[/deliveries]
    RoutesAPI[/routes]
    DriversAPI[/drivers]
    AuditAPI[/audit]
    DocsAPI[/api-docs y /openapi.json]
    Middleware[Auth middleware y roles]
    Services[Servicios: auditoría, estados, geocoding, Google Drive]
  end

  Backend --> Middleware
  Middleware --> BackendModules
  BackendModules --> Prisma[Prisma Client]
  Prisma --> Postgres[(PostgreSQL)]
```

## Acceso por rol

```mermaid
flowchart TD
  Login[Inicio de sesión] --> Token[JWT + usuario autenticado]
  Token --> RoleHome{Rol}

  RoleHome -->|admin| AdminHome[/dashboard]
  RoleHome -->|route_planner| PlannerHome[/rutas]
  RoleHome -->|billing| BillingHome[/reportes]
  RoleHome -->|driver| DriverHome[/conductor]

  AdminHome --> AdminModules[Dashboard, entregas, rutas, conductores y reportes]
  PlannerHome --> PlannerModules[Dashboard, rutas, conductores y entregas]
  BillingHome --> BillingModules[Dashboard, reportes y entregas]
  DriverHome --> DriverModules[Mis entregas, registro de entrega y check vehículo]
```

## Flujo operativo principal

```mermaid
flowchart TD
  Planner[Admin o planificador] --> CreateRoute[Crea o edita ruta]
  CreateRoute --> SelectDeliveries[Selecciona entregas]
  SelectDeliveries --> AssignDriver[Asigna conductor]
  AssignDriver --> AssignVehicle[Asigna vehículo]
  AssignVehicle --> PlanRoute[Deja ruta planificada]

  PlanRoute --> DriverView[Conductor ve sus rutas y entregas]
  DriverView --> DeliveryUpdate[Registra estado de entrega]
  DeliveryUpdate --> Evidence[Adjunta evidencia: foto, GPS y observaciones]
  Evidence --> StatusTransition[Backend valida transición de estado]
  StatusTransition --> Persist[Persiste entrega, eventos y auditoría]
  Persist --> Dashboard[Dashboard y reportes reflejan cambios]
```

## Flujo de administración de conductores

```mermaid
sequenceDiagram
  actor Admin as Administrador
  participant UI as DriverManagement.jsx
  participant API as /drivers
  participant DB as PostgreSQL
  participant Audit as AuditLog

  Admin->>UI: Crea conductor con nombre, usuario, patente opcional y clave provisoria confirmada
  UI->>API: POST /drivers
  API->>API: Valida confirmación y política de contraseñas
  API->>DB: Crea usuario con rol driver, hash de la clave y cambio obligatorio
  API->>Audit: Registra driver_created
  API-->>UI: Devuelve el conductor sin contraseña
  UI-->>Admin: Confirma el alta sin volver a mostrar la clave

  Admin->>UI: Edita conductor
  UI->>API: PUT /drivers/:id
  API->>DB: Actualiza nombre, usuario o vehículo predeterminado (la clave solo cambia con reset-password)
  API->>Audit: Registra driver_updated

  Admin->>UI: Elimina conductor
  UI->>API: DELETE /drivers/:id
  API->>DB: Verifica que no tenga rutas asignadas
  DB-->>API: Resultado de verificación
  API->>DB: Elimina conductor si no tiene rutas
  API->>Audit: Registra driver_deleted
```

## Flujo de ruta y entregas

```mermaid
sequenceDiagram
  actor Planner as Admin / Planificador
  participant RouteUI as RoutePlanner.jsx
  participant RoutesAPI as /routes
  participant DeliveriesAPI as /deliveries
  participant Audit as AuditLog
  participant Status as status-transitions.service
  participant DB as PostgreSQL

  Planner->>RouteUI: Define origen, destino, fecha, documento, conductor y vehículo
  RouteUI->>RoutesAPI: Crea o actualiza ruta
  RoutesAPI->>DB: Valida conductor, vehículo y paradas; actualiza Route y Delivery en una transacción
  RoutesAPI->>Audit: Registra route_reassigned si cambia el conductor

  actor Driver as Conductor
  Driver->>RouteUI: Abre entrega asignada
  RouteUI->>DeliveriesAPI: Actualiza estado y evidencia
  DeliveriesAPI->>Status: Valida cambio de estado
  Status-->>DeliveriesAPI: Transición válida
  DeliveriesAPI->>DB: Actualiza Delivery y crea DeliveryEvent
```

### Consistencia de asignaciones e historial

- `Route.driverId` es la fuente de verdad para las entregas no terminales (`pending`, `planned`, `in_progress`). Al reasignar una ruta, esas entregas cambian al nuevo conductor en la misma transacción; si no cambia el conductor, no se reescriben.
- Las paradas creadas con `POST /routes` comienzan en estado `pending`; la planificación no puede crear una entrega con resultado final.
- Las entregas terminales (`completed`, `rejected`, `not_found`) conservan el conductor que las ejecutó y no se pueden editar ni quitar desde `PUT /routes/:id`; sus cambios pertenecen al flujo operacional de entregas.
- `toRemove` solo libera entregas no terminales, estableciendo `routeId` y `driverId` en `null`. El intento de quitar una terminal responde HTTP 400 sin escrituras.
- La eliminación física de una ruta con entregas terminales se rechaza con HTTP 409. Sin terminales, las entregas se liberan y la ruta se elimina en una transacción.
- Las reasignaciones y eliminaciones se auditan dentro de la transacción, por lo que un fallo no deja una entrada de auditoría de una operación no confirmada.

### Check preoperacional y autorización de vehículos

- El conductor se identifica desde el JWT; los `driverId` del payload no cambian su identidad ni el alcance de sus checks.
- Un conductor puede inspeccionar su vehículo predeterminado o el de una ruta `draft`, `planned` o `in_progress` cuya fecha de servicio no sea histórica. Las rutas completadas e históricas no autorizan un vehículo.
- Los administradores pueden consultar y guardar checks para conductores existentes con rol `driver`; las operaciones registran el conductor afectado en la auditoría.
- La foto debe cargarse mediante el servicio de imágenes existente. No se aceptan URLs arbitrarias; al actualizar un check se puede conservar únicamente la URL ya almacenada para ese mismo check.
- Si no hay vehículo autorizado, la interfaz informa que el conductor debe contactar a administración y no permite enviar un check.

## Modelo de datos principal

```mermaid
erDiagram
  USER ||--o{ ROUTE : conduce
  USER ||--o{ DELIVERY : registra
  USER ||--o{ AUDIT_LOG : genera
  USER ||--o{ VEHICLE_CHECK : realiza
  USER }o--|| VEHICLE : vehiculo_predeterminado
  VEHICLE ||--o{ ROUTE : asignado_a
  VEHICLE ||--o{ VEHICLE_CHECK : revisado_en
  ROUTE ||--o{ DELIVERY : contiene
  DELIVERY ||--o{ DELIVERY_EVENT : registra

  USER {
    int id PK
    string username UK
    string name
    string passwordHash
    UserRole role
    int defaultVehicleId FK
    datetime createdAt
    datetime updatedAt
  }

  VEHICLE {
    int id PK
    string name
    string licensePlate UK
    decimal maxWeightKg
    decimal maxVolumeM3
  }

  ROUTE {
    int id PK
    datetime serviceDate
    datetime deliveryDate
    datetime startAt
    string origin
    string destination
    string documentType
    string documentNumber
    RouteStatus status
    int driverId FK
    int vehicleId FK
  }

  DELIVERY {
    int id PK
    string guideNumber
    string clientName
    string address
    decimal weightKg
    decimal volumeM3
    DeliveryStatus status
    int routeId FK
    int driverId FK
    string photoUrl
    decimal latitude
    decimal longitude
    string observations
    datetime deliveredAt
  }

  DELIVERY_EVENT {
    int id PK
    int deliveryId FK
    string action
    json metadata
    datetime createdAt
  }

  VEHICLE_CHECK {
    int id PK
    int driverId FK
    int vehicleId FK
    datetime checkDate
    int odometer
    string odometerPhotoUrl
    json items
    string observations
    string status
    datetime createdAt
    datetime updatedAt
  }

  AUDIT_LOG {
    int id PK
    int userId FK
    string action
    string entity
    int entityId
    json metadata
    datetime createdAt
  }
```

## Mapa de módulos por carpeta

```mermaid
flowchart TD
  Root[VGV-Connect] --> Backend[backend]
  Root --> Frontend[VGVConnect-react]

  Backend --> Controllers[controllers]
  Backend --> Routes[routes]
  Backend --> Middleware[middleware]
  Backend --> Services[services]
  Backend --> PrismaDir[prisma]
  Backend --> Docs[docs/openapi.js]

  Controllers --> AuthController[auth.controller.js]
  Controllers --> DeliveriesController[deliveries.controller.js]
  Controllers --> RoutesController[routes.controller.js]
  Controllers --> DriversController[drivers.controller.js]
  Controllers --> AuditController[audit.controller.js]

  Routes --> AuthRoutes[auth.routes.js]
  Routes --> DeliveryRoutes[deliveries.routes.js]
  Routes --> RouteRoutes[routes.routes.js]
  Routes --> DriverRoutes[drivers.routes.js]
  Routes --> AuditRoutes[audit.routes.js]

  PrismaDir --> Schema[schema.prisma]
  PrismaDir --> Seed[seed.js]
  PrismaDir --> Migrations[migrations]

  Frontend --> Pages[pages]
  Frontend --> Components[components]
  Frontend --> Api[api]
  Frontend --> Context[context]
  Frontend --> Hooks[hooks]
  Frontend --> ServicesFE[services]
  Frontend --> Utils[utils]

  Pages --> LoginPage[Login]
  Pages --> DashboardPage[Dashboard]
  Pages --> DeliveriesPage[Deliveries]
  Pages --> DriversPage[Drivers]
  Pages --> RoutePlannerPage[RoutePlanner]
  Pages --> ReportsPage[Reportes]

  Api --> Axios[http.js]
  Axios --> Backend
```

## Responsabilidades por módulo

| Módulo | Responsabilidad principal |
| --- | --- |
| Login/Auth | Autenticación, persistencia del token y redirección por rol. |
| Dashboard | Lectura de KPIs, tabla, filtros, gráficos y mapa operativo. |
| Entregas | Gestión y seguimiento de entregas, estados y evidencia. |
| Rutas | Creación, planificación y asignación de rutas a conductor/vehículo. |
| Conductores | Resumen operativo y mantención de conductores. |
| Reportes | Métricas históricas y rendimiento por período/conductor. |
| API Express | Expone endpoints, aplica CORS, auth y reglas de negocio. |
| Prisma/PostgreSQL | Persistencia de usuarios, vehículos, rutas, entregas, eventos y auditoría. |
| Servicios backend | Auditoría, transiciones de estado, geocoding y almacenamiento de evidencias. |
