# VGV Connect – Documentación Base

## 1. Descripción General
VGV Connect es una plataforma logística full‑stack diseñada para gestionar rutas, entregas, choferes y el control operativo de VGV SPA.  
Incluye un frontend moderno en React + Vite y un backend robusto en Node.js + Express.

---

## 2. Arquitectura del Sistema

### Frontend (VGVConnect-react/)
- React + Vite
- React Router para navegación
- Axios para consumo de API
- Componentes modulares por página
- Manejo de sesión con JWT

### Backend (backend/)
- Node.js + Express
- API REST modular
- Controladores, servicios y rutas separadas
- Middleware de autenticación y roles
- Integración con Google Drive para fotos de guías

### Base de Datos
Recomendada: PostgreSQL  
Tablas principales:
- users
- drivers
- routes
- deliveries
- delivery_files

---

## 3. Módulos del Sistema

### 3.1 Autenticación
- Login con JWT
- Roles: Admin, Operaciones, Chofer

### 3.2 Rutas
- Crear rutas
- Asignar chofer
- Cambiar estado (pendiente, en curso, finalizada)

### 3.3 Entregas
- Listado por ruta
- Actualización de estado
- Subida de fotos a Google Drive
- Registro de hora real vs hora compromiso

### 3.4 Dashboard Gerencial
- Entregas del día
- Atrasos
- Tiempos promedio
- KPIs operativos

---

## 4. Integraciones

### Google Drive
- Subida de fotos desde frontend
- Backend genera archivo en Drive
- Se guarda URL pública en la base de datos

---

## 5. Estructura de Carpetas

VGV-CONNECT/
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── integrations/
│   │   ├── utils/
│   │   └── config/
│   └── .env
│
├── VGVConnect-react/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── assets/
│   └── .env
│
└── base.md
---

## 6. Variables de Entorno

### Backend
PORT=5000
DB_URL=postgres://...
JWT_SECRET=...
GOOGLE_SERVICE_KEY=...
FRONTEND_URL=http://localhost:5173
### Frontend
VITE_API_URL=http://localhost:5000

---

## 7. Flujo General del Sistema

1. Usuario inicia sesión → recibe JWT  
2. Frontend consume API según rol  
3. Chofer actualiza entregas y sube fotos  
4. Backend guarda datos y archivos en Drive  
5. Dashboard muestra métricas en tiempo real  

---

## 8. Roadmap Futuro
- App móvil para choferes pwa
- Geolocalización en tiempo real
- Optimización automática de rutas
- Notificaciones a clientes
