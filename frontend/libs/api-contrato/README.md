# @nianva/api-contrato

Tipos TypeScript generados desde `docs/api/openapi.json` (API-08). No tiene código en
ejecución: solo tipos.

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

La regla `respuesta-del-contrato` exige que el tipo de `http.get/post/put/patch/delete` sobre
`urlApi(...)` salga de esta lib. Los servicios que aún no cumplen están en
`tools/eslint-rules/contrato-pendientes.json`, una lista que solo baja. Las rutas de sesión
(`urlSesion`: `/login`, `/logout`, `/password/*`) no están en la especificación y siguen
escritas a mano.
