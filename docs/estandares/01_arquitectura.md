# 01. Arquitectura (ARQ)

> Aprobado el 2026-10-30. Formato de cada regla: **Regla** · **Por qué** · **Verifica** · **Desde**.

## Backend (Laravel 13)

### ARQ-01 · Capas fijas
- **Regla:** cada petición sigue la misma cadena, y ninguna capa se salta:

  ```
  Route → Controller → FormRequest → Action / Service → Model → BD
  ```

  - **Controller:** delgado. Recibe el FormRequest, llama una Action y devuelve un Resource. Sin
    consultas, sin reglas de negocio y sin transacciones.
  - **FormRequest:** valida, autoriza (Policy) y entrega un DTO.
  - **Action:** un caso de uso (`RegistrarVenta`, `AbonarCredito`). Es dueña de la transacción.
  - **Service:** lógica de dominio reutilizable y sin estado (`PricingService`, `StockLedger`).
  - **Model:** relaciones, scopes y casts. Sin reglas de negocio.
- **Por qué:** en Lite, la lógica de un mismo flujo vivía repartida entre el controlador, el
  modelo y el JS (precio, stock, crédito), y cada arreglo había que hacerlo en varios lugares
  (L-25).
- **Verifica:** revisión del PR más una regla de arquitectura en los tests (Pest Arch o un test
  propio) que impide `DB::` y `Model::query()` en `Http/Controllers`.
- **Desde:** Fase 1, para código nuevo y tocado.

### ARQ-02 · Entradas tipadas
- **Regla:**
  - todo endpoint de escritura usa un FormRequest con `rules()` y `authorize()`;
  - el FormRequest expone `toDto()`, que devuelve un DTO `readonly`;
  - las Actions reciben DTOs, nunca `Request` ni arreglos sueltos.
- **Por qué:**
  - en Lite, una variable indefinida borró el perfil de giro sin ningún error (L-15);
  - en Pro, la validación vive en el controlador (C8).
- **Verifica:** test de arquitectura (sin `$request->validate(` en controladores) y PHPStan en
  nivel 8 sobre `app/Modules`.
- **Desde:** Fase 1.

### ARQ-03 · Orquestación entre módulos en Actions de aplicación
- **Regla (D5):**
  - un módulo no importa el Service de otro fuera del grafo permitido (se hereda el de
    `.claude/CLAUDE.md` §1);
  - cuando un caso de uso cruza módulos (venta a crédito, devolución con nota de crédito,
    cierre de caja con gastos), la orquestación vive en una Action de la capa `Aplicacion/`,
    no en el controlador ni en un Service;
  - la lista numerada de "instancias de orquestación en Controller" se retira.
- **Por qué:** esa lista ya va en 7 excepciones (`API_SPECIFICATION.md` §14) y crece con cada
  módulo (C11).
- **Verifica:** test de arquitectura sobre namespaces (`Modules\X\Services` no importa
  `Modules\Y\Services` salvo el grafo).
- **Desde:** Fase 1.

### ARQ-04 · Transacciones y bloqueos solo en Actions
- **Regla:**
  - `DB::transaction()` y `lockForUpdate()` solo dentro de una Action;
  - una Action que llama a otra reutiliza la transacción abierta;
  - todo saldo (stock, crédito, caja) se lee con `lockForUpdate()` dentro de la misma
    transacción que lo modifica.
- **Por qué:** `CreditoCliente::abonar` bloqueaba con `FOR UPDATE` fuera de una transacción y el
  bloqueo se soltaba al instante (L-04).
- **Verifica:** test de concurrencia por cada Action que mueve saldo (dos llamadas con la misma
  versión de saldo; el saldo final cuadra) y una regla de arquitectura que impide
  `lockForUpdate` fuera de `Actions/`.
- **Desde:** Fase 3.

### ARQ-05 · Un solo `PricingService`
- **Regla:**
  - todo precio que se cobra o se cotiza sale de `PricingService::cotizar(Carrito, Contexto)`:
    TPV, apartados, cotizaciones, devoluciones y cambios, y el precio de etiquetas;
  - el contexto lleva tenant, sucursal, cliente o segmento, fecha y lista de precio;
  - el resultado trae, por línea, el precio base, la lista aplicada, cada regla (con prioridad
    y si es combinable), el descuento, el impuesto y el total;
  - ningún otro código lee `precio` de la variante o del producto para cobrar.
- **Por qué:**
  - en Lite, el precio por variante exigía tocar unos 19 archivos (L-25);
  - las promociones, el mayoreo, "N por $X" y los cupones eran sistemas separados sin
    prioridad (L-26).
- **Verifica:**
  - tests en forma de tabla (carrito → resultado esperado), con los casos de paridad con Lite;
  - una búsqueda en CI de lecturas directas de `precio_venta`/`precio` fuera de `Precios/` y de
    los Resources de catálogo.
- **Desde:** Fase 3.

### ARQ-06 · Features por plan, verificadas en el servidor
- **Regla:**
  - cada ruta de un módulo opcional lleva el middleware `modulo:<clave>` (`ModuloActivo`, que
    se hereda de Pro), ampliado para leer las features del plan además de `modulos_activos`;
  - la licencia o el plan conceden la feature, y el tenant puede apagarla, pero nunca
    encenderla si su plan no la incluye;
  - los límites (sucursales, terminales, usuarios) se validan en la Action que crea el recurso;
  - el frontend oculta lo que no está incluido, pero la autoridad es el backend.
- **Por qué:** el tabulador vende el mismo código en planes con features distintas; si el
  límite solo existe en el menú, cualquier llamada directa a la API lo salta.
- **Verifica:** un test por feature (plan sin la feature → 403 `modulo_no_activo`) y otro por
  límite (→ 422 `limite_plan_excedido`).
- **Desde:** Fase 7. El middleware y la convención se fijan en la Fase 1.

### ARQ-07 · El giro es configuración, no código
- **Regla:**
  - ningún `if ($giro === 'ropa')` en el código;
  - los atributos de variante son genéricos (`atributos` → `atributo_valores` → la variante
    los referencia);
  - el perfil de giro define atributos, unidades, categorías semilla, plantilla de etiqueta y
    features sugeridas;
  - ningún texto de un giro concreto ("Talla", "Color", "Ropa") en vistas ni mensajes: sale del
    perfil.
- **Por qué:** Lite y Pro ataron las variantes a talla y color, y cada giro nuevo pedía tocar
  código (L-24).
- **Verifica:**
  - una búsqueda en CI de `'ropa'|'zapateria'|talla|color` en código de dominio y plantillas
    (sin contar seeders de perfiles);
  - un test que da de alta un tenant con dos perfiles distintos y vende en ambos.
- **Desde:** Fase 3.

### ARQ-08 · Tipado estricto en todo el código
- **Regla:**
  - PHP: `declare(strict_types=1)`, tipos en parámetros y retornos, y PHPStan en nivel 8;
  - TypeScript: `strict: true`, sin `any` explícito;
  - una función o símbolo inexistente es un error de compilación, no de ejecución.
- **Por qué:** `escapeAttr()` no existía y el error solo apareció en el TPV del cliente (L-02).
- **Verifica:** PHPStan y `tsc` (vía `nx lint` / `nx build`) en CI, bloqueantes.
- **Desde:** Fase 1, con una línea base que solo baja para el código heredado.

### ARQ-09 · Una sola capa de métricas
- **Regla:**
  - los reportes, KPI y tableros calculan con query objects de `Modules/Metricas` (vendido,
    neto, devoluciones, cambios, utilidad, mermas);
  - cada métrica tiene una definición en el glosario de métricas, con su fórmula;
  - ningún reporte arma su propio `SUM`.
- **Por qué:** "Ventas netas" dejó de sumar los cambios en un reporte de Lite y en otro no (L-20).
- **Verifica:** un test por métrica con un juego de datos fijo, y un test de que dos reportes
  que muestran la misma métrica dan el mismo número.
- **Desde:** Fase 6.

### ARQ-10 · Módulos congelados
- **Regla:**
  - Nómina, Préstamos, Delivery y CRM avanzado quedan como módulos opcionales **congelados**:
    no se amplían, sus tests deben seguir verdes y se apagan por feature;
  - se descongela uno solo por decisión explícita.
- **Por qué:** el plan concentra el esfuerzo en el POS; mantener módulos laterales a medias
  multiplica la superficie de errores.
- **Verifica:** CODEOWNERS sobre esas carpetas; un PR que las toca necesita aprobación del
  responsable.
- **Desde:** Fase 1.

## Frontend (Angular 22 / Nx)

### ARQ-11 · Capas de librerías Nx
- **Regla:** cada lib lleva una etiqueta, y las dependencias van en un solo sentido:

  ```
  app (shell) → feature/<modulo> → domain/<modulo> → ui/* , core
                                    ui/* → ui/tokens
  ```

  - `ui/*` no conoce el dominio;
  - un `feature` no importa otro `feature`: usa el contrato `BuscadorEntidad` mediante un
    token de inyección (se hereda de `.claude/CLAUDE.md` §4).
- **Por qué:** en Lite, un componente compartido dependía de variables de la vista que lo usaba
  (L-19).
- **Verifica:** la regla `@nx/enforce-module-boundaries` en el lint, bloqueante.
- **Desde:** Fase 2.

### ARQ-12 · Estado y efectos
- **Regla:**
  - estado local con signals;
  - las llamadas HTTP solo desde servicios de `domain/*`, que devuelven tipos del contrato
    OpenAPI generado;
  - los componentes no llaman a `HttpClient`;
  - los errores HTTP los maneja un interceptor global (toast con el `message`, acciones según
    el `error_code`); un componente solo maneja el `error_code` que espera.
- **Por qué:** en Lite, cada vista manejaba sus propios errores de `fetch` y los mensajes
  quedaban duplicados o vacíos.
- **Verifica:** lint (sin `HttpClient` en `feature/**/*.component.ts`) y un test del interceptor.
- **Desde:** Fase 2.

### ARQ-13 · Configuración en tiempo de ejecución
- **Regla:**
  - la URL de la API, el modo (escritorio, LAN, servidor, SaaS) y el tenant se leen de
    `config.json` (o del subdominio en SaaS) al arrancar;
  - nada de `localhost:8000` ni URLs fijas en el código;
  - un mismo build sirve en todos los entornos.
- **Por qué:** el plan vende cuatro entornos; compilar uno por cliente no escala.
- **Verifica:** una búsqueda en CI de `http://`/`localhost` en `apps/**` y `libs/**`, y un test de
  arranque con dos `config.json`.
- **Desde:** Fase 1.

## Excepciones

Ninguna acordada.
