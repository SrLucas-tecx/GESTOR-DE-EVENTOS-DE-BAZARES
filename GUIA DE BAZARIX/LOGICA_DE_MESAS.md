# Lógica de mesas de BAZARIX

Todo el código de mesas que no es pantalla vive ahora en `js/mesas.js`.
La pantalla (formulario del expositor, «Editar mesa», plano) solo llama a esas funciones.

## 1. Fuente de verdad
La **mesa del plano** manda:

| Campo de la mesa | Significado |
|---|---|
| `exhibitorId` | Dueño de la mesa (o de la mitad A si está compartida) |
| `shared` | `true` = mesa compartida (2 medias mesas) |
| `exhibitorId2` | Dueño de la mitad B (solo si `shared`) |
| `attended` / `absent` | Asistencia del dueño A |
| `attended2` / `absent2` | Asistencia del dueño B |

Del **expositor** solo se *derivan* (nunca se editan a mano): `tableIds`, `tableId` y `ubicacion`.
Una sola función los recalcula: `syncAllTableAssignments(bz)`.
`ubicacionAnterior` guarda, aparte, un texto de ubicación escrito a mano antes de que existiera el plano.

## 2. Reglas
- **Mesa completa:** un solo expositor de tipo «completa».
- **Media mesa:** la mesa queda `shared` y admite hasta 2 expositores de tipo «media».
- **Límite:** cada expositor puede ocupar las mesas que solicitó (la media mesa cuenta como 1).
  En eventos de varios días el límite se cuenta **por día**.
- `tableAvailability(mesa, expositor, tipo)` decide si una mesa está disponible, ocupada o bloqueada.
  La usan el selector de mesas del formulario y el guardado, así la regla existe en un solo lugar.
- Una mesa completa ocupada por *otro* expositor se puede reasignar con confirmación;
  una mesa compartida no se le puede quitar a sus dos expositores de golpe.

## 3. Funciones de `mesas.js`
| Función | Para qué |
|---|---|
| `getExpositorTableIds` | Mesas que ocupa un expositor (se leen del plano) |
| `getExpositorRequestedTableCount` | Cuántas mesas pidió |
| `tableAvailability` | Reglas de disponibilidad (arriba) |
| `mesasPorDia`, `_mesasDelMismoDia` | Conteo para el límite por día |
| `getExpositorLocation` | Texto «A-01, A-02» o «Día 1: A-01 · Día 2: B-03» |
| `applyExpositorTableAssignments` | Asignación desde el formulario del expositor |
| `assignTableOwners` | Asignación desde «Editar mesa» (1 o 2 expositores, con colores) |
| `removeTableFromExpositorAssignment` | Deja la mesa sin dueños |
| `syncAllTableAssignments` | Recalcula los campos derivados |

## 4. Errores encontrados y corregidos
1. **Mesa que «resucitaba» al recargar.** Si quitabas la última mesa de un expositor desde su formulario, se
   guardaba su ubicación vieja («A-01»); al abrir la app, la migración leía ese texto y le devolvía la mesa si
   estaba libre. Ahora la migración de ubicaciones antiguas corre **una sola vez por bazar** y la ubicación se
   deriva siempre del plano.
2. **«Editar mesa» guardaba a medias.** Cambiaba nombre, tamaño y color *antes* de validar a los expositores;
   si una regla fallaba, esos cambios quedaban en memoria y se guardaban con la siguiente acción. Ahora primero
   se validan los expositores y solo después se modifica la mesa.
3. **Ubicación desfasada.** Al renombrar una mesa o al numerarlas, el texto de ubicación guardado en el
   expositor quedaba con el nombre viejo (se usa en Control de Pagos, Alertas y la búsqueda). Ahora esas
   pantallas leen la ubicación real y todo se recalcula tras cada cambio.
4. **Expositor de «mesa completa» dentro de una mesa compartida.** Al cambiar su tipo de espacio, seguía en la
   mitad de la mesa. Ahora, si nadie más la comparte, la mesa vuelve a ser completa.
5. **Mismo expositor en las dos mitades** (dato dañado por una importación): se corrige al cargar.

## 5. Redundancia eliminada
- Tres copias de la regla de disponibilidad (selector, guardado, asignación) → `tableAvailability`.
- Sincronizar expositor por expositor en 8 lugares → `syncAllTableAssignments` (desde cualquier punto).
- `getExpositorTableId` (sin uso) y un bloque de `resetBazaarCanvas` que repetía lo que ya hacía la sincronización.
- `getExpositorTableIds` ya no mezcla copias guardadas (`tableIds`, `ubicacion`) con el plano: lee solo el plano.
