# @nianva/api-contrato

Tipos TypeScript generados desde `docs/api/openapi.json` (API-08). Su único código en
ejecución es el mapa de límites de formulario (`limitesDe()`, UI-11b); el resto son tipos.

## Regenerar

Cuando cambia el backend:

1. regenera la especificación en `backend/` (el paso "Verificar especificacion OpenAPI" de CI
   dice cómo, siempre contra una SQLite nueva);
2. en `frontend/`, corre `node libs/api-contrato/scripts/generar.mjs`.

CI falla si `src/lib/openapi.ts` no coincide con la especificación (`--check`).

## Uso en un servicio

```ts
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';

listar(): Observable<Gasto[]> {
  return this.http
    .get<RespuestaDe<'/gastos', 'get'>>(urlApi('/gastos'))
    .pipe(map((r) => r.data));
}

registrar(descripcion: string, monto: number): Observable<Gasto> {
  const cuerpo: CuerpoDe<'/gastos', 'post'> = { descripcion, monto };

  return this.http.post<RespuestaDe<'/gastos', 'post'>>(urlApi('/gastos'), cuerpo).pipe(map((r) => r.data));
}
```

- `RespuestaDe<ruta, metodo>`: cuerpo de la respuesta 200 (o 201), con su envoltura `data`.
- `CuerpoDe<ruta, metodo>`: cuerpo que acepta el FormRequest.
- Cada esquema se exporta con su nombre: `SesionResource`, `GastoResource`, etc. Un tipo
  del frontend que lo nombra distinto es un alias (`type Gasto = GastoResource`).

## Límites de formulario (UI-11b)

`generar.mjs` también escribe `src/lib/limites.ts`: por ruta, método y campo del cuerpo de la
petición, `requerido`, `maxLength`, `minimum`, `maximum` y `decimales` (de `multipleOf`, que el
backend publica para la regla `decimal:0,N`, o de un `pattern` D2/D3/D4). Solo los campos de
primer nivel; los de las líneas (`items.*`) no entran.

```ts
import { limitesDe } from '@nianva/api-contrato';

const LIMITES = limitesDe('/categorias', 'post');

// En un DynamicFormField: requerido, maxlength, min, max y step salen del contrato.
{ name: 'nombre', label: 'Nombre', type: 'text', limite: LIMITES.nombre }
// En una plantilla propia:
// <input [maxlength]="limites.nombre.maxLength" />
```

`limitesDe()` no compila si la ruta o el método no existen o no reciben cuerpo, ni si se pide
un límite que el contrato no declara. `--check` también compara `limites.ts`.

La regla `respuesta-del-contrato` exige que el tipo de `http.get/post/put/patch/delete` sobre
`urlApi(...)` salga de esta lib. Los servicios que aún no cumplen están en
`tools/eslint-rules/contrato-pendientes.json`, una lista que solo baja. Las rutas de sesión
(`urlSesion`: `/login`, `/logout`, `/password/*`) no están en la especificación y siguen
escritas a mano.
