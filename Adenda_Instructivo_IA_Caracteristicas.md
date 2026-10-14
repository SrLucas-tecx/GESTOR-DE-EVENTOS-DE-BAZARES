# Adenda para el Documento 2 (Instructivo para la IA) — Características

Pega este bloque dentro del instructivo, en la parte donde se describen las secciones `categorias` y `expositores`.

## Cambio: las subcategorías ahora son "características"

- Las categorías (`categorias`) **ya no tienen subcategorías**. No uses `tipo`, `parentId` ni `tieneSubcategorias`.
- Nueva sección global `caracteristicas`: etiquetas extra del negocio (ej. "Hecho a mano", "Vegano"). Cada elemento:
  `{ "id": "car-...", "nombre": "...", "emoji": "🏷️", "color": "#0d9488", "descripcion": "" }`
- Cada expositor puede traer `"caracteristicas": ["car-...", "car-..."]` (lista de ids; vacía o ausente si no tiene). **Ya no existe** el campo `subcategoria`.
- Reglas:
  1. Crea características **solo si el archivo las trae de forma explícita** (columna "etiquetas", "especialidades", "características", etc.). Nunca las deduzcas de la descripción de un negocio.
  2. Usa ids deterministas a partir del nombre (ej. `car-hecho-a-mano`), igual que con las categorías.
  3. Todo id de `expositor.caracteristicas` debe existir en la sección `caracteristicas` del mismo JSON.
  4. Si el archivo no trae características, omite la sección `caracteristicas` y deja a los expositores sin ese campo.
  5. Si recibes datos con subcategorías, conviértelos a características con las reglas anteriores.

Ejemplo:

```json
"caracteristicas": [
  { "id": "car-hecho-a-mano", "nombre": "Hecho a mano", "emoji": "🧶", "color": "#0d9488", "descripcion": "" }
],
"expositores": [
  { "id": "exp-dona-lupe", "nombre": "Lupe Pérez", "negocio": "Doña Lupe", "categoria": "cat-2",
    "caracteristicas": ["car-hecho-a-mano"] }
]
```
