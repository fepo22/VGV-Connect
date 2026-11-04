
🛣️ ROADMAP OFICIAL – VGV CONNECT


VGV-CONNECT-FRONTEND
│
├── /src
│   ├── /components          # UI reutilizable
│   │   ├── LoginForm.jsx
│   │   ├── RoutePlanner.jsx
│   │   ├── DeliveryForm.jsx
│   │   └── Dashboard.jsx
│   │
│   ├── /pages               # Vistas principales
│   │   ├── Home.jsx
│   │   ├── Rutas.jsx
│   │   ├── Entregas.jsx
│   │   └── Reportes.jsx
│   │
│   ├── /services            # Conexión con API REST
│   │   ├── api.js           # Configuración base (axios/fetch)
│   │   ├── authService.js   # Login/Register
│   │   ├── rutasService.js  # CRUD de rutas
│   │   ├── entregasService.js # Registro de entregas
│   │   └── dashboardService.js # KPIs y reportes
│   │
│   ├── /context             # Contexto global (Auth, Rutas)
│   │   ├── AuthContext.jsx
│   │   └── RutasContext.jsx
│   │
│   └── main.jsx             # Punto de entrada React
│
└── vite.config.js           # Configuración de Vite

VGV-CONNECT-BACKEND
│
├── server.js                # Punto de entrada principal
├── /config                  # Configuración general (DB, JWT, etc.)
│   ├── db.js
│   └── auth.js
│
├── /routes                  # Endpoints de cada módulo
│   ├── auth.routes.js
│   ├── rutas.routes.js
│   ├── entregas.routes.js
│   └── dashboard.routes.js
│
├── /controllers             # Lógica de negocio
│   ├── auth.controller.js
│   ├── rutas.controller.js
│   ├── entregas.controller.js
│   └── dashboard.controller.js
│
├── /models                  # Modelos de datos (MongoDB o SQL)
│   ├── Usuario.js
│   ├── Ruta.js
│   ├── Entrega.js
│   └── Vehiculo.js
│
└── /middleware              # Autenticación, validaciones, logs
    ├── auth.middleware.js
    └── error.middleware.js
