# Adenda para el Documento 2 (Instructivo para la IA) — Media mesa, color y precios de mesa

Pega este bloque junto a las secciones `expositores`, `plano` y `costos`. **Todo es opcional: omite lo que el archivo no mencione.**

## Expositores
- `mesaTipo`: `"completa"` (por defecto) o `"media"`. Usa `"media"` solo si el archivo dice «media mesa», «½ mesa» o equivalente. Un expositor de media mesa lleva `mesasCantidad: "1"`.
- `color`: color en el plano, formato `#rrggbb`. Solo si el archivo lo trae; nunca lo inventes.

## Plano (mesas compartidas)
- Una mesa compartida entre dos expositores de media mesa lleva `"shared": true`, `"exhibitorId": "<id mitad A>"` y `"exhibitorId2": "<id mitad B>"`.
- Máximo 2 expositores por mesa. Si solo hay uno en una mesa compartida, deja `exhibitorId2` vacío.
- Las mesas normales no llevan `shared` ni `exhibitorId2`.

## Costos
- `tablePrice`: precio por mesa completa; `halfTablePrice`: precio de una media mesa (no es la mitad: es el precio que el archivo indique). Si el archivo no los trae, déjalos en `0`.

Ejemplo:

```json
"expositores": [ { "id": "exp-ana", "negocio": "Ana Pines", "nombre": "Ana", "mesaTipo": "media", "mesasCantidad": "1", "color": "#ef4444", "costo": 350 } ],
"costos": { "tablePrice": 600, "halfTablePrice": 350 }
```
