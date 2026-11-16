# @nianva/core-http

Piezas HTTP que comparten la app y los servicios de `libs/domain/*` (ARQ-11, ARQ-12b):

- `urlApi()` y `urlSesion()`, con la base del backend que fija `configurarBaseApi()` al
  arrancar (ARQ-13);
- `ERROR_EN_PANTALLA`, el `HttpContextToken` con el que un servicio le dice al interceptor
  que la pantalla maneja los errores de esa petición;
- `ConsultaPagina`, la página, el orden y los filtros de un listado, con la misma forma que el
  evento de la tabla de `ui-shared`.

Es `type:core`: no depende de ninguna otra lib. `apps/pos/src/app/core/api-config.ts` la
reexporta para no cambiar los imports de la app.
