# Continuidad de desarrollo - 05-11-2026

## Punto de respaldo

- Repositorio: `fepo22/VGV-Connect`.
- Rama local: `main`.
- Commit base local: `0a2519e24b4f447ef98b21d542d719b0e46a90f2`
  (`feat: cerrar B4 complementaria y ciclo de sesion B6`).
- Este documento forma parte del commit local de respaldo de las cuatro tareas
  siguientes. Su hash se obtiene con `git log -1 --format=%H -- docs/continuidad-2026-11-05.md`.
- B4 sigue pendiente de consolidacion y cierre formal. No iniciar B7 ni B8.

## Completado

1. Correccion del desfase horario de rutas:
   - Lectura y escritura de `startTime` coherentes e independientes de la zona
     horaria del servidor.
   - La hora operacional de America/Santiago se conserva como componentes UTC;
     no se reinterpretaron ni migraron filas historicas.
   - Pruebas de guardados repetidos, medianoche y cambios de horario.
2. Proteccion del formulario CheckVehiculo ante fallos de carga:
   - Guardado bloqueado mientras no se verifique el check existente.
   - Mensaje explicito, reintento disponible y conservacion de los datos locales
     cuando falla la carga.
3. Ocultamiento de detalles internos en errores HTTP 500:
   - Respuesta JSON generica con `errorId`; diagnostico en el registro interno.
   - Los mensajes funcionales 400, 401, 403, 404 y 409 no se reemplazan.
4. Confirmacion visual en Routeplanner al crear, editar y reasignar:
   - Confirmacion solo despues del exito de la API.
   - La reasignacion indica el nombre del nuevo conductor.
   - Un HTTP 500 muestra error y no muestra confirmacion de exito.

## Validaciones realizadas

### Ejecutadas nuevamente antes de este commit

Todas finalizaron con codigo de salida 0:

| Area | Comando | Resultado |
|---|---|---|
| Backend | `npm test` en `backend` | PASS: suite completa, incluidas fechas, asignaciones y manejo de errores |
| Frontend | `npm run lint` en `VGVConnect-react` | PASS |
| Frontend | `npm test` en `VGVConnect-react` | PASS |
| Frontend | `npm run build` en `VGVConnect-react` | PASS |
| Git | `git diff --check` | PASS |

La suite automatizada usa dobles de prueba y, para el error de conexion Prisma,
un destino local inalcanzable. No requiere acceder a una base real ni a produccion.
La revision del indice y `git diff --cached --check` son controles adicionales
previos a crear el commit.

### Evidencia funcional obtenida en las tareas anteriores del 05-11-2026

Estas pruebas no se repitieron durante la preparacion del commit:

- Integridad B4 con PostgreSQL local desechable: 19/19 PASS.
- Correccion horaria: pruebas de navegador y PostgreSQL; 08:00 se conserva tras
  varios guardados y recarga, y 23:30 se conserva cerca de medianoche.
- CheckVehiculo: 6/6 escenarios PASS en navegador, incluidos reintento,
  conservacion de datos y ausencia de peticiones de guardado durante el fallo.
- Errores HTTP 500: pruebas automatizadas y comprobacion contra servidor local
  con PostgreSQL desechable; respuesta publica generica y respuestas funcionales
  conservadas.
- Reasignacion desde la interfaz real de Routeplanner: 17/17 PASS. Las entregas
  no terminales pasan a B; la completada conserva a A y su historial;
  `route_reassigned` registra origen y destino correctos.
- Confirmacion visual de Routeplanner: 5/5 PASS en navegador con PostgreSQL:
  crear (201), editar (200), reasignar (200, nombre de B), 500 simulado sin
  exito falso y persistencia tras recargar.
- En esa ultima validacion, la ruta sintetica #5 conservo el destino editado,
  conductor B e inicio 08:00 en PostgreSQL. El cambio rechazado no persistio.
- Las bases desechables se eliminaron y los servidores de prueba se detuvieron.
  Los datos sinteticos, capturas y scripts temporales no forman parte del respaldo.

## Archivos de las cuatro tareas

Las rutas reales del backend no estan todas bajo `backend/src`:

- `backend/services/operational-date.service.js`
- `backend/controllers/routes.controller.js`
- `backend/services/operational-date.service.test.js`
- `backend/assignments.consistency.test.js`
- `VGVConnect-react/src/pages/Drivers/CheckVehiculo.jsx`
- `VGVConnect-react/src/pages/RoutePlanner/Routeplanner.jsx`
- `backend/package.json`
- `backend/src/app.js`
- `backend/error-handler.test.js`
- `backend/middleware/error-handler.middleware.js`

Se agrega este documento como unico archivo adicional de continuidad.
No se incluyen archivos `.env`, secretos, logs, bases ni exportaciones de datos.
No se modificaron autenticacion, modelos, migraciones, `optimizeRoute` ni el
criterio de ordenamiento de las entregas.

## Divergencia del remoto y resolucion posterior

- Remoto configurado: `https://github.com/fepo22/VGV-Connect.git`.
- Seguimiento de `main`: `origin/main`.
- Al verificar el remoto, `origin/main` apunto a
  `3c7e5990829d90f096e907150d70f4e1bbe372f9`
  (`chore: publicar cambios de la copia local`), tras una actualizacion forzada
  respecto de la referencia local anterior.
- Antes de este respaldo habia 22 commits exclusivos locales y 2 exclusivos
  remotos; las versiones diferian en 150 archivos.
- Un push normal del historial local no es fast-forward. No se hizo force push,
  merge, rebase ni sustitucion del historial remoto.
- El usuario autorizo continuar con pruebas, documento y commit local,
  dejando el push pendiente.
- La configuracion versionada de Render no desactiva expresamente los
  despliegues automaticos. Antes de un futuro push debe confirmarse por separado
  que se respeta la condicion de respaldo sin despliegue; no se consulto ni
  modifico produccion para comprobarlo.
- El stash existente se conserva sin aplicar, modificar ni eliminar.

### Integracion autorizada despues del respaldo local

- Respaldo local creado: `1ef2c9cf3b87e02d344febcbac2f0559a9b26d0d`.
- El usuario autorizo integrar mejoras compatibles del remoto conservando el
  nucleo PostgreSQL actual y sin activar los modulos mock antiguos.
- Se resolvieron 23 conflictos archivo por archivo. Se mantienen los contratos
  actuales de las APIs, autenticacion, modelo y migraciones, controles de
  acceso, reportes, rutas y entregas, asi como las cuatro correcciones validadas.
- Los pedidos/clientes basados en mocks, sus pantallas dependientes y el modelo
  alternativo no se activan ni se copian al arbol final. Sus versiones originales
  siguen disponibles en los commits remotos incorporados como ancestros.
- Se incorpora el componente reutilizable de notificaciones del remoto
  (`ToastContext.jsx` y `toast-context.js`) y su proveedor en el layout actual.
  La confirmacion de Routeplanner conserva su mensaje existente, sin duplicados.
- No se incorpora Leaflet ni se cambian dependencias o el proveedor de mapas:
  esa alternativa requiere una decision funcional separada.
- El usuario confirmo que los despliegues automaticos estan desactivados y
  autorizo el push normal a `origin/main` tras validar la fusion. No se modifico
  ninguna configuracion de despliegue ni se accedio a produccion.
- El estado final del push debe verificarse comparando `HEAD` con la referencia
  `refs/heads/main` del remoto. No se autoriza force push.

## Pendiente y proximos pasos

1. Verificar que la fusion validada quede respaldada en `origin/main` mediante
   push normal, sin force push. Los dos historiales deben ser ancestros del merge.
2. Mantener los despliegues automaticos desactivados para este respaldo.
3. Diagnosticar por que cambia el orden de las entregas/paradas despues de
   guardar una ruta. Identificar con el usuario el criterio de orden esperado
   antes de modificar codigo. No corregirlo todavia.
4. Consolidar las evidencias de B4 y realizar su cierre formal solo tras revision.
5. No iniciar B7 ni B8.

## Limites conocidos conservados

- `startAt` representa hora operacional, no un instante UTC absoluto; los datos
  antiguos creados con un servidor no UTC no se corrigieron retroactivamente.
- Los errores 400 por JSON mal formado y 413 por exceso de tamano mantienen el
  comportamiento previo de Express; en desarrollo pueden incluir HTML y stack.
  Este respaldo no amplia el alcance del manejador de errores.
- El orden de paradas observado tras guardar sigue sin corregir.
