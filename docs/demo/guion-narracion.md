# Guion de narración — Demo Vgv Connect TMS

Guion pensado para generar locución con voz IA (TTS) y subtítulos sincronizados. Los tiempos están alineados al video grabado (`docs/demo/vgv-connect-demo.mp4`, duración total ≈ 42 s). Cada bloque indica: rango de tiempo, pantalla mostrada y texto a narrar.

Tono sugerido: profesional, cercano, ritmo pausado (para dar tiempo a leer subtítulos).

---

### 1. Intro (00:00 – 00:03)
**Pantalla:** Login
**Narración:**
> "Vgv Connect es un sistema de gestión de transporte: centraliza entregas, rutas, conductores y reportes en una sola plataforma."

### 2. Inicio de sesión (00:03 – 00:08)
**Pantalla:** Login → ingreso con usuario y contraseña
**Narración:**
> "El acceso es por roles: administrador, planificador de rutas, facturación y conductor. Cada usuario ve solo las herramientas que necesita."

### 3. Módulo Dashboard (00:08 – 00:14)
**Pantalla:** Dashboard
**Narración:**
> "El Dashboard resume la operación del día: indicadores clave, gráficos de desempeño y un mapa con la ubicación de las entregas en tiempo real."

### 4. Módulo Entregas (00:14 – 00:19)
**Pantalla:** Entregas
**Narración:**
> "En el módulo de Entregas se listan todos los despachos, con filtros por estado, cliente y fecha, para hacer seguimiento a cada guía."

### 5. Módulo Rutas — General (00:19 – 00:24)
**Pantalla:** Rutas (vista "Todas")
**Narración:**
> "El módulo de Rutas agrupa toda la programación: aquí se ve, en una sola pantalla, tanto las rutas de entrega como las de retiro."

### 6. Submódulo Rutas > Entregas (00:24 – 00:29)
**Pantalla:** Rutas → Entregas
**Narración:**
> "Dentro de Rutas, el submódulo de Entregas permite crear recorridos de despacho a clientes, asignando conductor, vehículo y ordenando los puntos de descarga."

### 7. Submódulo Rutas > Retiros (00:29 – 00:33)
**Pantalla:** Rutas → Retiros
**Narración:**
> "El submódulo de Retiros funciona igual, pero para planificar el retiro de mercadería o compras directamente en los proveedores."

### 8. Módulo Conductores (00:33 – 00:37)
**Pantalla:** Choferes
**Narración:**
> "El módulo de Conductores administra al equipo de choferes, su vehículo asignado y su disponibilidad para nuevas rutas."

### 9. Módulo Reportes (00:37 – 00:42)
**Pantalla:** Reportes
**Narración:**
> "Finalmente, Reportes entrega métricas de facturación y desempeño operativo, para evaluar la eficiencia del transporte en el tiempo."

### 10. Cierre (00:42 – 00:45, opcional si se extiende el video)
**Narración:**
> "Vgv Connect: entregas, rutas y conductores, todo en un solo lugar."

---

## Notas para producción

- **Voz IA:** generar cada bloque como un audio independiente (o uno continuo) respetando las duraciones máximas indicadas, para que no se desincronice con el video.
- **Subtítulos:** el archivo `docs/demo/subtitles.srt` ya tiene los mismos 9 cortes con los tiempos exactos del video grabado; puede usarse tal cual o reemplazando el texto por esta narración más extendida (ajustando duraciones si el audio TTS resulta más largo que el segmento actual).
- Si la narración TTS excede el tiempo de una escena, lo más simple es reexportar el video con pausas más largas en esa pantalla (el script de grabación está en `record2.mjs`, parámetro `hold` de cada escena).
