# 06. Proceso y calidad (PRO)

> Aprobado el 2026-10-30. Formato: **Regla** · **Por qué** · **Verifica** · **Desde**.
> Aplica por igual a cualquiera que cambie el código: el responsable, Claude o DS.

### PRO-01 · Los tests existentes no se reescriben
- **Regla:**
  - un archivo de test existente solo **recibe** métodos nuevos;
  - modificar o borrar un test existente requiere decirlo en el reporte, con el motivo, y la
    aprobación del responsable;
  - un test que falla se arregla en el código, no en el test, salvo que el test esté mal, y eso
    se explica.
- **Por qué:** DS reescribió `BackupHelperTest` completo y se perdieron 11 tests sin que el
  reporte lo dijera (L-17).
- **Verifica:**
  - CODEOWNERS sobre `backend/tests/**` y `**/*.spec.ts`;
  - un script en CI que compara el número de métodos de test por archivo contra la rama base y
    falla si alguno baja o si se borra un archivo de test (un `git mv` no cuenta como pérdida).
    Cuando el responsable aprueba la excepción, pone la etiqueta `pro-01-autorizado` en el PR y
    el paso solo informa; nunca la pone el autor del cambio.
- **Desde:** Fase 1.

### PRO-02 · La suite siempre en verde
- **Regla:**
  - no se cierra un cambio con tests en rojo, ni "en rojo de antes";
  - los tests rojos heredados se arreglan o se eliminan en un cambio propio, que lista cada uno
    con su motivo;
  - prohibido `markTestSkipped` y `it.skip` sin una issue enlazada y fecha.
- **Por qué:** sin CI, nada impide cerrar un cambio con la suite en rojo (L-32, C9), y con la
  suite en rojo nadie nota la siguiente falla.
- **Verifica:** CI bloqueante sobre `php artisan test` y `nx run-many -t test`, y un escaneo de
  `skip` sin referencia.
- **Desde:** Fase 1, en cuanto se sanee la suite.

### PRO-03 · Las líneas base solo bajan
- **Regla:**
  - toda línea base (UI-16, PHPStan, deuda de lint) solo se regenera para registrar deuda
    **corregida**;
  - regenerarla para tapar una violación nueva está prohibido;
  - el PR que la regenera muestra el diff (antes y después) y requiere aprobación del
    responsable.
- **Por qué:** la línea base de Lite funcionó mientras nadie la regeneró por comodidad (L-22).
- **Verifica:** un script en CI que falla si algún conteo de la línea base sube, y CODEOWNERS
  sobre los archivos `*-baseline.*`.
- **Desde:** Fase 1.

### PRO-04 · Un bug se corrige con su test primero
- **Regla:**
  - primero el test que reproduce la falla, comprobando que falla;
  - luego la corrección, y el test pasa;
  - "corregido" en un commit o reporte solo vale con ese test nombrado;
  - el reporte incluye la salida del test antes y después.
- **Por qué:** el commit `71d97a2` de Lite decía corregir el costo en cambios, y no lo hacía
  (L-06).
- **Verifica:** la revisión del PR (un `fix` sin un test nuevo o modificado se rechaza).
- **Desde:** Fase 0, en Lite también.

### PRO-05 · Análisis estático bloqueante
- **Regla:** CI corre, y bloquea si falla:
  - PHPStan (ARQ-08);
  - Pint;
  - las reglas de arquitectura;
  - ESLint (incluidas SEG-04 y UI-05);
  - stylelint (UI-01, UI-04);
  - `tsc` estricto;
  - el diff del contrato OpenAPI (API-08).
- **Por qué:** una función inexistente (`escapeAttr`, L-02) y una variable indefinida (L-15)
  llegaron a producción porque nada las revisaba antes de ejecutar.
- **Verifica:** el propio pipeline.
- **Desde:** Fase 1, salvo dos piezas: stylelint entra en la Fase 2, con el sistema de diseño
  que sus reglas protegen, y el diff de OpenAPI cuando se genere la especificación (API-08).

### PRO-06 · Un tema por encargo y sin pisar otras sesiones
- **Regla:**
  - un encargo (o PR) cubre un solo tema;
  - antes de editar, el agente revisa `git status`; si un archivo tiene cambios ajenos, no lo
    sobrescribe: lo reporta y espera;
  - nadie revierte cambios que no hizo;
  - mientras otro agente trabaja, no se recarga la BD de pruebas ni se corre la suite contra
    ella (o cada sesión usa su propia BD de pruebas).
- **Por qué:** DS revirtió cambios de otra sesión en las etiquetas (L-18), y en Lite la BD de
  pruebas se compartía.
- **Verifica:** la revisión del diff (solo archivos del tema) y BD de pruebas por proceso
  (`DB_DATABASE=nianva_test_${worker}`).
- **Desde:** Fase 1.

### PRO-07 · Quien cambia un servicio compartido re-corre a sus consumidores
- **Regla:** modificar `PricingService`, `StockLedger`, `VentaService`, `TenantContext` o
  cualquier servicio con varios consumidores obliga a correr la suite de cada módulo que lo
  usa, y el reporte lo dice (se hereda de `.claude/CLAUDE.md` §5).
- **Por qué:** "Ventas netas" se rompió en un reporte al cambiar otro (L-20).
- **Verifica:** en CI corre la suite completa en cada PR; localmente, el reporte lista los
  módulos re-corridos.
- **Desde:** Fase 1.

### PRO-08 · Datos de prueba reproducibles
- **Regla:**
  - factories para todo modelo y seeders por escenario (tenant ropa, tenant abarrotes con
    granel, tenant multi-sucursal, tenant con plan Lite);
  - los tests construyen sus datos con factories, sin depender de un dump;
  - los casos de paridad con Lite viven en fixtures con nombre y propósito.
- **Por qué:** el fixture SQL de Lite debía poder cargarse dos veces y se rompía con cada cambio
  de esquema (L-27).
- **Verifica:** `migrate:fresh --seed` en CI para cada escenario, y la suite con
  `RefreshDatabase`.
- **Desde:** Fase 1.

### PRO-09 · Flujo de un encargo a DS
1. **Prompt:** contexto, archivos con ruta y línea, la regla de estos estándares que aplica
   (por ID), los tests esperados y lo que **no** debe tocar.
2. **DS implementa** y entrega un reporte con:
   - archivos tocados;
   - el conteo de tests antes y después (por suite);
   - la salida de los comandos;
   - lo que no pudo hacer;
   - el checklist de cierre (abajo).
3. **Revisión del diff** contra el prompt: cambios fuera del tema, tests modificados (PRO-01),
   líneas base (PRO-03) y reglas incumplidas.
4. **Prueba manual** en el navegador, en claro, en oscuro y en celular cuando toca UI.
5. **Commit solo con autorización** del responsable, un commit por tema, con mensaje en
   español y prefijo (`feat`, `fix`, `chore`, `docs`, `test`, `refactor`).
- **Por qué:** es el flujo que funcionó en la revisión de Lite, con los controles que
  faltaron (L-17, L-18).
- **Verifica:** el reporte sin checklist o sin conteo de tests se devuelve.
- **Desde:** Fase 1.

### PRO-10 · Documentos de estrategia fuera del repo de código
- **Regla:**
  - los análisis de mercado, tabuladores, borradores de plan y segmentación no se suben al repo
    del producto;
  - solo se suben los estándares aprobados y la documentación técnica vigente;
  - la lista de archivos excluidos vive en `.git/info/exclude` o en `.gitignore`, no en la
    memoria de nadie.
- **Por qué:** en Lite, la exclusión dependía de recordarla en cada commit.
- **Verifica:** `.gitignore` y la revisión de `git status` antes del commit.
- **Desde:** Fase 1.

## Checklist de cierre (va en todo reporte)

```
[ ] Tema único; archivos tocados listados; sin cambios ajenos revertidos        (PRO-06)
[ ] Tests: conteo antes → después por suite; ninguno modificado o borrado        (PRO-01)
    sin decirlo; suite completa en verde                                          (PRO-02)
[ ] Bug: test que reproduce, falla antes y pasa después (salida incluida)        (PRO-04)
[ ] Estático: PHPStan, Pint, ESLint, stylelint, tsc, reglas de arquitectura      (PRO-05)
[ ] Líneas base sin subir; si bajan, diff incluido                               (PRO-03)
[ ] Capas: FormRequest + DTO + Action; transacción y bloqueo en la Action        (ARQ-01..04)
[ ] Datos: cantidades decimal + unidad, dinero decimal, foto NOT NULL sin ?? 0,  (DAT-01..04)
    libro con saldo antes y después
[ ] Seguridad: scope tenant + sucursal con test 404; sucursal del contexto;      (SEG-01..03)
    permiso conectado; sin innerHTML                                             (SEG-04)
[ ] API: /api/v1, sobre estándar, error_code en catálogo, OpenAPI actualizado    (API-01..08)
[ ] Precios: solo PricingService; métricas solo desde la capa de métricas        (ARQ-05, ARQ-09)
[ ] Giro: sin textos ni condiciones de un giro concreto                          (ARQ-07)
[ ] UI: componentes de libs/ui, sin colores ni @media en la pantalla; revisado   (UI-01..05)
    en claro, oscuro y 375 px; montos y cantidades con pipe
[ ] Codificación: UTF-8 sin BOM, sin U+FFFD                                      (DAT-12)
[ ] Git: sin commit salvo indicación; documentos de estrategia fuera             (PRO-09, PRO-10)
```

## Excepciones

Ninguna acordada.
