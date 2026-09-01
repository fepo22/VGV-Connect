# Guion de narración — Demo Vgv Connect TMS

Guion usado para generar la locución con voz IA (TTS) y los subtítulos quemados en el video (`docs/demo/vgv-connect-demo.mp4`, duración total ≈ 86 s, dentro del límite de 2 minutos). Cada bloque indica el rango de tiempo, la pantalla mostrada y el texto narrado.

---

### 1. Intro (00:00 – 00:07)
**Pantalla:** Login
> "Vgv Connect: gestión de entregas, rutas y conductores en un solo sistema."

### 2. Inicio de sesión — admin (00:08 – 00:16)
**Pantalla:** Login → ingreso como administrador
> "Acceso por roles: administrador, planificador de rutas, facturación y conductor."

### 3. Módulo Dashboard (00:17 – 00:24)
**Pantalla:** Dashboard
> "Dashboard: KPIs, gráficos y mapa de entregas en tiempo real."

### 4. Módulo Entregas (00:25 – 00:30)
**Pantalla:** Entregas
> "Entregas: listado con filtros por estado, cliente y fecha."

### 5. Módulo Rutas — General (00:30 – 00:35)
**Pantalla:** Rutas (vista "Todas")
> "Rutas: vista general de entregas y retiros programados."

### 6. Submenú Rutas > Entregas (00:36 – 00:41)
**Pantalla:** Rutas → Entregas
> "Submenú Entregas: arma recorridos de despacho a clientes."

### 7. Submenú Rutas > Retiros (00:41 – 00:47)
**Pantalla:** Rutas → Retiros
> "Submenú Retiros: planifica el retiro de mercadería en proveedores."

### 8. Módulo Conductores — vista admin (00:47 – 00:52)
**Pantalla:** Choferes
> "Conductores: gestión de choferes, vehículos y disponibilidad."

### 9. Módulo Reportes (00:53 – 00:58)
**Pantalla:** Reportes
> "Reportes: métricas de facturación y desempeño operativo."

### 10. Inicio de sesión — conductor (00:58 – 01:04)
**Pantalla:** Login → ingreso como conductor
> "Ahora el módulo de conductor: inicio de sesión con su propia cuenta."

### 11. Panel del conductor (01:05 – 01:11)
**Pantalla:** Panel de conductor ("Mis entregas")
> "Panel del conductor: ruta activa y entregas pendientes del día."

### 12. Submenú Check vehículo (01:11 – 01:18)
**Pantalla:** Conductor → Check vehículo
> "Submenú Check vehículo: checklist y foto del tablero antes de salir a ruta."

### 13. Submenú Registrar entrega (01:19 – 01:26)
**Pantalla:** Conductor → Registrar entrega (adjunta foto del documento firmado y confirma)
> "Submenú Registrar entrega: sube la foto del documento firmado y confirma el resultado."

---

## Notas de producción

- **Voz IA:** cada bloque se generó como audio independiente (gTTS, español) y se ubicó exactamente en el segundo de inicio de su escena.
- **Subtítulos:** `docs/demo/subtitles.srt` contiene los mismos 13 cortes con los tiempos exactos del video; se quemaron en el video con fuente reducida (tamaño 10) para no tapar la interfaz.
- **Datos del conductor demo:** usuario `chofer1` / contraseña `chofer1234`, con una ruta y una entrega de ejemplo (`R-DEMO-001` / guía `G-1001`) creadas solo para la grabación.
- Si se necesita regenerar el video, el script de grabación está en `record4.mjs` (fuera del repo, en el entorno de trabajo) y respeta el límite de 2 minutos ajustando el parámetro `hold` de cada escena según la duración del audio.
