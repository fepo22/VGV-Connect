const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "VGV Connect API",
    version: "1.0.0",
    description: "API operativa para planificación de rutas, entregas, choferes y auditoría.",
  },
  servers: [{ url: "http://localhost:4000", description: "Entorno local" }],
  tags: [
    { name: "Autenticación" },
    { name: "Rutas" },
    { name: "Entregas" },
    { name: "Choferes" },
    { name: "Check vehículo" },
    { name: "Auditoría" },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: { type: "object", properties: { message: { type: "string" } } },
      LoginRequest: { type: "object", required: ["identifier", "password"], properties: { identifier: { type: "string", example: "admin" }, password: { type: "string", example: "admin123" } } },
      LoginResponse: { type: "object", properties: { token: { type: "string" }, user: { type: "object", properties: { id: { type: "integer" }, username: { type: "string" }, name: { type: "string" }, role: { type: "string", enum: ["admin", "route_planner", "billing", "driver"] } } } } },
      RouteStop: { type: "object", required: ["client", "address"], properties: { id: { type: "integer", nullable: true }, client: { type: "string" }, address: { type: "string" }, guideNumber: { type: "string" }, status: { type: "string", enum: ["pending", "planned", "in_progress", "completed", "rejected", "not_found"] } } },
      RouteInput: { type: "object", required: ["date", "startTime", "destination", "driverId", "vehicleId"], properties: { date: { type: "string", format: "date" }, deliveryDate: { type: "string", format: "date", nullable: true }, startTime: { type: "string", example: "08:00" }, origin: { type: "string" }, destination: { type: "string" }, driverId: { type: "integer" }, vehicleId: { type: "integer" }, weightKg: { type: "number", minimum: 0 }, volumeM3: { type: "number", minimum: 0 }, status: { type: "string", enum: ["draft", "planned", "in_progress", "completed"] }, stops: { type: "array", items: { $ref: "#/components/schemas/RouteStop" } } } },
      Route: { allOf: [{ $ref: "#/components/schemas/RouteInput" }, { type: "object", properties: { id: { type: "integer" }, documentNumber: { type: "string", example: "Ruta 18-08-2026 / 001" }, driverName: { type: "string" }, vehicleName: { type: "string" }, stops: { type: "array", items: { $ref: "#/components/schemas/RouteStop" } } } }] },
      DeliveryStatusUpdate: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["pending", "planned", "in_progress", "completed", "rejected", "not_found"] }, photoUrl: { type: "string", nullable: true }, observations: { type: "string", nullable: true }, location: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } } }, timestamp: { type: "string", format: "date-time" } } },
      Delivery: { type: "object", properties: { id: { type: "integer" }, routeId: { type: "integer", nullable: true }, guideNumber: { type: "string" }, client: { type: "string" }, address: { type: "string" }, status: { type: "string" }, photoUrl: { type: "string", nullable: true }, location: { type: "object", nullable: true }, observations: { type: "string", nullable: true } } },
      VehicleCheckInput: { type: "object", required: ["vehicleId", "checkDate", "odometerPhoto", "items"], properties: { driverId: { type: "integer", description: "Solo admin; el conductor autenticado se usa automáticamente" }, vehicleId: { type: "integer" }, checkDate: { type: "string", format: "date" }, odometer: { type: "integer", minimum: 0 }, odometerPhoto: { type: "string", description: "Imagen del tablero codificada en Data URL" }, odometerPhotoUrl: { type: "string" }, items: { type: "object", additionalProperties: { type: "object", properties: { status: { type: "string", enum: ["pending", "ok", "attention"] }, observation: { type: "string" } } } }, observations: { type: "string", nullable: true } } },
      VehicleCheck: { allOf: [{ $ref: "#/components/schemas/VehicleCheckInput" }, { type: "object", properties: { id: { type: "integer" }, driverId: { type: "integer" }, odometerPhotoUrl: { type: "string" }, status: { type: "string", enum: ["pending", "ok", "attention"] }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } }] },
    },
  },
  paths: {
    "/auth/login": { post: { tags: ["Autenticación"], summary: "Iniciar sesión", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } }, responses: { 200: { description: "Sesión iniciada", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } }, 400: { description: "Credenciales inválidas", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } } } },
    "/routes": {
      get: { tags: ["Rutas"], security: [{ bearerAuth: [] }], summary: "Listar rutas", parameters: [{ in: "query", name: "driverId", schema: { type: "integer" } }], responses: { 200: { description: "Rutas y catálogos operativos" }, 401: { description: "No autenticado" } } },
      post: { tags: ["Rutas"], security: [{ bearerAuth: [] }], summary: "Crear ruta", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RouteInput" } } } }, responses: { 201: { description: "Ruta creada", content: { "application/json": { schema: { $ref: "#/components/schemas/Route" } } } }, 400: { description: "Datos inválidos" }, 403: { description: "Sin permiso" } } },
    },
    "/routes/{id}": {
      get: { tags: ["Rutas"], security: [{ bearerAuth: [] }], summary: "Obtener ruta", parameters: [{ $ref: "#/components/parameters/RouteId" }], responses: { 200: { description: "Ruta", content: { "application/json": { schema: { $ref: "#/components/schemas/Route" } } } }, 404: { description: "Ruta no encontrada" } } },
      put: { tags: ["Rutas"], security: [{ bearerAuth: [] }], summary: "Actualizar ruta o sus puntos", parameters: [{ $ref: "#/components/parameters/RouteId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RouteInput" } } } }, responses: { 200: { description: "Ruta actualizada" }, 400: { description: "Transición o datos no válidos" } } },
      delete: { tags: ["Rutas"], security: [{ bearerAuth: [] }], summary: "Eliminar ruta y desasignar sus entregas", parameters: [{ $ref: "#/components/parameters/RouteId" }], responses: { 204: { description: "Ruta eliminada" }, 404: { description: "Ruta no encontrada" } } },
    },
    "/routes/{id}/optimize": { post: { tags: ["Rutas"], security: [{ bearerAuth: [] }], summary: "Planificar una ruta en borrador", description: "En el MVP mueve la ruta de borrador a planificada.", parameters: [{ $ref: "#/components/parameters/RouteId" }], responses: { 200: { description: "Ruta planificada" }, 400: { description: "Transición no permitida" } } } },
    "/deliveries": { get: { tags: ["Entregas"], security: [{ bearerAuth: [] }], summary: "Listar entregas", parameters: [{ in: "query", name: "driverId", schema: { type: "integer" } }], responses: { 200: { description: "Entregas", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Delivery" } } } } } } } },
    "/deliveries/history": { get: { tags: ["Entregas"], security: [{ bearerAuth: [] }], summary: "Historial del chofer autenticado", responses: { 200: { description: "Eventos de entrega" }, 403: { description: "Solo chofer" } } } },
    "/deliveries/{id}/status": { put: { tags: ["Entregas"], security: [{ bearerAuth: [] }], summary: "Actualizar estado de una entrega", description: "Respeta las transiciones Pendiente/Planificado a En progreso y En progreso a resultado final.", parameters: [{ $ref: "#/components/parameters/DeliveryId" }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DeliveryStatusUpdate" } } } }, responses: { 200: { description: "Entrega actualizada" }, 400: { description: "Transición no permitida" }, 403: { description: "Entrega no asignada" } } } },
    "/deliveries/{id}/photo": { post: { tags: ["Entregas"], security: [{ bearerAuth: [] }], summary: "Subir evidencia fotográfica", parameters: [{ $ref: "#/components/parameters/DeliveryId" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["photoData"], properties: { photoData: { type: "string", description: "Imagen codificada en Data URL" } } } } } }, responses: { 200: { description: "URL de evidencia" } } } },
    "/drivers/overview": { get: { tags: ["Choferes"], security: [{ bearerAuth: [] }], summary: "Resumen de carga y operación por chofer", responses: { 200: { description: "Indicadores de choferes" }, 403: { description: "Solo administración o planificación" } } } },
    "/vehicle-checks": {
      get: { tags: ["Check vehículo"], security: [{ bearerAuth: [] }], summary: "Listar checks de vehículo", parameters: [{ in: "query", name: "driverId", schema: { type: "integer" } }, { in: "query", name: "vehicleId", schema: { type: "integer" } }, { in: "query", name: "date", schema: { type: "string", format: "date" } }], responses: { 200: { description: "Checks encontrados", content: { "application/json": { schema: { type: "object", properties: { checks: { type: "array", items: { $ref: "#/components/schemas/VehicleCheck" } } } } } } } } },
      post: { tags: ["Check vehículo"], security: [{ bearerAuth: [] }], summary: "Crear o actualizar check preoperacional", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VehicleCheckInput" } } } }, responses: { 201: { description: "Check guardado", content: { "application/json": { schema: { type: "object", properties: { check: { $ref: "#/components/schemas/VehicleCheck" } } } } } }, 400: { description: "Datos inválidos" }, 403: { description: "Sin permiso" } } },
    },
    "/audit": { get: { tags: ["Auditoría"], security: [{ bearerAuth: [] }], summary: "Listar auditoría", responses: { 200: { description: "Últimos 200 eventos" }, 403: { description: "Solo administración" } } } },
  },
};

openApiDocument.components.parameters = {
  RouteId: { in: "path", name: "id", required: true, schema: { type: "integer" } },
  DeliveryId: { in: "path", name: "id", required: true, schema: { type: "integer" } },
};

export default openApiDocument;