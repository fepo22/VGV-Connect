# Guion de narración — Demo Vgv Connect TMS

Guion usado para generar la locución con voz IA (edge-tts, voz `es-CL-LorenzoNeural`, tono comercial y cercano) y los subtítulos quemados en el video (`docs/demo/vgv-connect-demo.mp4`, duración total ≈ 2:08 min). Cada bloque indica el rango de tiempo, la pantalla mostrada y el texto narrado.

---

### 1. Intro (00:00 – 00:11)
**Pantalla:** Login
> "Vgv Connect es la plataforma pensada para transportistas que quieren dejar el papel y las planillas atrás: entregas, rutas y conductores, todo en un solo lugar, fácil de usar desde el primer día."

### 2. Inicio de sesión — admin (00:12 – 00:21)
**Pantalla:** Login → ingreso como administrador
> "El acceso es simple y seguro: cada persona entra con su propio usuario y ve solo lo que necesita, ya sea administrador, planificador, facturación o conductor."

### 3. Módulo Dashboard (00:22 – 00:32)
**Pantalla:** Dashboard
> "El Dashboard te da el control total de un vistazo: indicadores clave, gráficos de desempeño y un mapa en tiempo real, para tomar decisiones rápidas y con datos reales."

### 4. Módulo Entregas (00:33 – 00:41)
**Pantalla:** Entregas
> "El módulo de Entregas te permite hacer seguimiento a cada despacho, con filtros por estado, cliente y fecha, para que ninguna entrega se te escape."

### 5. Módulo Rutas — General (00:41 – 00:49)
**Pantalla:** Rutas (vista "Todas")
> "En Rutas organizas toda tu operación: entregas y retiros, planificados desde una sola pantalla, ahorrando tiempo y evitando errores."

### 6. Submenú Rutas > Entregas (00:50 – 00:58)
**Pantalla:** Rutas → Entregas
> "El submenú Entregas te ayuda a armar el recorrido perfecto para cada despacho, asignando conductor, vehículo y puntos de descarga en minutos."

### 7. Submenú Rutas > Retiros (00:58 – 01:06)
**Pantalla:** Rutas → Retiros
> "El submenú Retiros hace lo mismo para coordinar el retiro de mercadería o compras con tus proveedores, sin llamadas ni planillas paralelas."

### 8. Módulo Conductores — vista admin (01:06 – 01:13)
**Pantalla:** Choferes
> "El módulo Conductores te permite gestionar a tu equipo de choferes, sus vehículos asignados y su disponibilidad, todo desde un mismo panel."

### 9. Módulo Reportes (01:14 – 01:21)
**Pantalla:** Reportes
> "Reportes te entrega la información que necesitas para decidir mejor: facturación, desempeño y cumplimiento, siempre actualizados."

### 10. Inicio de sesión — conductor (01:21 – 01:28)
**Pantalla:** Login → ingreso como conductor
> "Y en terreno, cada conductor tiene su propio acceso: simple, rápido y pensado para usarse desde el celular."

### 11. Panel del conductor (01:29 – 01:36)
**Pantalla:** Panel de conductor ("Mis entregas")
> "Su panel muestra la ruta activa y las entregas del día, para que sepa exactamente qué hacer sin perder tiempo."

### 12. Submenú Check vehículo (01:36 – 01:51)
**Pantalla:** Conductor → Check vehículo (se marcan ítems de Documentación, Seguridad obligatoria, Condición del vehículo y Carga y operación)
> "Antes de salir a ruta, completa el check vehicular: documentación, seguridad obligatoria, condición mecánica y carga, con una foto del tablero como respaldo, para operar siempre seguro."

### 13. Submenú Registrar entrega (01:51 – 02:01)
**Pantalla:** Conductor → Registrar entrega (adjunta foto del documento firmado y confirma)
> "Al momento de entregar, el conductor sube la foto del documento firmado y confirma el resultado, dejando trazabilidad total de cada operación."

### 14. Cierre (02:01 – 02:08)
**Pantalla:** Vuelve al Login
> "Vgv Connect: más control, más eficiencia y más tranquilidad, en cada entrega. Súmate hoy."

---

## Notas de producción

- **Voz IA:** edge-tts con la voz chilena `es-CL-LorenzoNeural` (rate +8%) para un tono comercial, cercano y natural, más adecuado para una demo de venta que la voz robotizada anterior.
- **Transiciones:** la navegación entre módulos se hace haciendo clic en el sidebar (como un usuario real), no recargando la página, para evitar el flash blanco de una recarga completa entre pantallas.
- **Check vehicular:** en la escena 12 se marcan en vivo ítems de las 4 secciones del checklist (Documentación, Seguridad obligatoria, Condición del vehículo, Carga y operación) y se completa el odómetro, para mostrar realmente los elementos del control preoperacional.
- **Subtítulos:** `docs/demo/subtitles.srt` contiene los 14 cortes con los tiempos exactos del video; se queman con fuente reducida (tamaño 10) para no tapar la interfaz.
- **Datos del conductor demo:** usuario `chofer1` / contraseña `chofer1234`, con una ruta y una entrega de ejemplo (`R-DEMO-001` / guía `G-1001`) creadas solo para la grabación.
- Si se necesita regenerar el video, el script de grabación está en `record6.mjs` (fuera del repo, en el entorno de trabajo).
