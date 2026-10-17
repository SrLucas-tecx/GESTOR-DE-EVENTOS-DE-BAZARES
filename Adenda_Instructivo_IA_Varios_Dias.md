# Adenda para el Documento 2 (Instructivo para la IA) — Eventos de varios días y color

Pega este bloque en el instructivo, junto a las secciones `ficha`, `expositores`, `minutoAMinuto`, `plano` y `general`.

## Eventos de varios días (solo si el archivo lo indica)

- Si el evento dura **más de un día**, la sección `ficha` incluye:
  `"multiDia": true` y `"dias": [ { "id": "dia-sabado", "nombre": "Sábado", "fecha": "2026-12-12" }, { "id": "dia-domingo", "nombre": "Domingo", "fecha": "2026-12-13" } ]` (mínimo 2 días).
- Los demás datos apuntan a esos días **por id**:
  - `expositor.diasParticipacion`: lista de ids. **Vacía u omitida = participa todos los días.**
  - `minutoAMinuto[].dia`: id del día. **Vacío u omitido = la actividad se repite todos los días.**
  - `plano.floors[].dia`: id del día al que pertenece el plano. Vacío = plano sin día.
- Reglas:
  1. Usa `multiDia` y `dias` **solo si el archivo habla explícitamente de varios días** (ej. «Día 1 / Día 2», «sábado y domingo»). Si no, omite `multiDia` y `dias`.
  2. Usa ids deterministas a partir del nombre o la fecha (ej. `dia-sabado`).
  3. Todo id usado en `diasParticipacion`, `minutoAMinuto[].dia` o `floors[].dia` debe existir en `ficha.dias`.
  4. Si el archivo no dice en qué días participa un expositor, déjalo **sin** `diasParticipacion`. Nunca lo deduzcas.
  5. Fechas en `YYYY-MM-DD`; si falta la fecha de un día, déjala vacía y anótalo en `_notas_conversion`.

## Color del bazar (opcional)

- En `general`: `"color": "#0d9488"` (formato `#RRGGBB`). Solo si el archivo lo trae; no lo inventes.

Ejemplo:

```json
"ficha": { "fecha": "2026-12-12", "multiDia": true,
  "dias": [ { "id": "dia-sabado", "nombre": "Sábado", "fecha": "2026-12-12" },
            { "id": "dia-domingo", "nombre": "Domingo", "fecha": "2026-12-13" } ] },
"expositores": [ { "id": "exp-dona-lupe", "nombre": "Lupe Pérez", "negocio": "Doña Lupe", "diasParticipacion": ["dia-sabado"] } ],
"minutoAMinuto": [ { "id": "min-apertura", "dia": "", "time": "10:00", "activity": "Apertura" },
                   { "id": "min-taller", "dia": "dia-domingo", "time": "12:00", "activity": "Taller" } ]
```
