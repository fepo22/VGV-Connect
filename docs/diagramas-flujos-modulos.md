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
    Chofer[Panel de conductor]
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
  RoleHome -->|driver| DriverHome[/chofer]

  AdminHome --> AdminModules[Dashboard, entregas, rutas, conductores y reportes]
  PlannerHome --> PlannerModules[Dashboard, rutas, conductores y entregas]
  BillingHome --> BillingModules[Dashboard, reportes y entregas]
  DriverHome --> DriverModules[Mis entregas y registro de entrega]
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

  Admin->>UI: Crea conductor con nombre, usuario y patente opcional
  UI->>API: POST /drivers
  API->>API: Genera contraseña provisoria de 4 dígitos
  API->>DB: Crea usuario con rol driver
  API->>Audit: Registra driver_created
  API-->>UI: Devuelve conductor y contraseña provisoria
  UI-->>Admin: Muestra credenciales temporales

  Admin->>UI: Edita conductor
  UI->>API: PUT /drivers/:id
  API->>DB: Actualiza nombre, usuario, password o vehículo predeterminado
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
  participant Status as status-transitions.service
  participant DB as PostgreSQL

  Planner->>RouteUI: Define origen, destino, fecha, documento, conductor y vehículo
  RouteUI->>RoutesAPI: Crea o actualiza ruta
  RoutesAPI->>DB: Guarda Route

  Planner->>RouteUI: Agrega o asocia entregas
  RouteUI->>DeliveriesAPI: Crea o actualiza Delivery
  DeliveriesAPI->>DB: Guarda Delivery con routeId y driverId

  actor Driver as Conductor
  Driver->>RouteUI: Abre entrega asignada
  RouteUI->>DeliveriesAPI: Actualiza estado y evidencia
  DeliveriesAPI->>Status: Valida cambio de estado
  Status-->>DeliveriesAPI: Transición válida
  DeliveriesAPI->>DB: Actualiza Delivery y crea DeliveryEvent
```

## Modelo de datos principal

```mermaid
erDiagram
  USER ||--o{ ROUTE : conduce
  USER ||--o{ DELIVERY : registra
  USER ||--o{ AUDIT_LOG : genera
  USER }o--|| VEHICLE : vehiculo_predeterminado
  VEHICLE ||--o{ ROUTE : asignado_a
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
