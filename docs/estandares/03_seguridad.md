# 03. Seguridad (SEG)

> Aprobado el 2026-10-30. Formato: **Regla** · **Por qué** · **Verifica** · **Desde**.

### SEG-01 · Scope de tenant y sucursal obligatorio
- **Regla:**
  - todo modelo de negocio aplica el scope de tenant (`BelongsToTenant` o
    `BelongsToTenantViaRelacion`, que se heredan de Pro);
  - los datos operativos (ventas, stock, caja, gastos, apartados, devoluciones, clientes por
    sucursal) aplican además el scope de sucursal, salvo para un usuario con
    `sucursales.todas`;
  - un recurso de otro tenant o de otra sucursal responde **404**, no 403, para no confirmar
    que existe;
  - el route model binding usa el scope, de modo que un `{venta}` ajeno ni siquiera se resuelve.
- **Por qué:** en Lite, el kardex, `buscarTicket`, el detalle de venta y la ficha de cliente
  devolvían datos de otra sucursal cambiando un id en la URL (L-03).
- **Verifica:**
  - un test de aislamiento **por endpoint**: un usuario de la sucursal B pide un recurso de la
    sucursal A → 404, y un usuario de otro tenant → 404;
  - un test que recorre `Route::getRoutes()` y falla si una ruta con parámetro de modelo no
    tiene su test de aislamiento registrado.
- **Desde:** Fase 1.

### SEG-02 · La sucursal viene del contexto, no del request
- **Regla:**
  - la sucursal de una operación se resuelve de la terminal o de la sesión del usuario;
  - un `sucursal_id` que llegue en el payload o en la query solo se acepta si el usuario tiene
    `sucursales.todas` **y** la sucursal pertenece a su tenant; si no, se ignora y se usa la de
    la sesión (en filtros) o se responde 422 (en escrituras).
- **Por qué:**
  - en Lite, `MovimientoController` tomaba `sucursal_id` de `$_GET` sin revisar el rol (L-03);
  - en Pro, varios `store()` lo aceptan del payload (C3).
- **Verifica:** un test por endpoint que acepta el campo (vendedor con otra sucursal → se
  ignora o 422; admin → se respeta).
- **Desde:** Fase 1.

### SEG-03 · Permisos conectados
- **Regla:**
  - toda acción está protegida por un permiso (`modulo.accion`), verificado por el
    middleware `permiso:<modulo.accion>` de su ruta; es la única autoridad (sin Policies, para
    no tener dos reglas que se contradigan);
  - una ruta autenticada sin permiso solo se acepta como autoservicio del propio usuario o
    dato público del tenant, y queda listada con su razón en el test;
  - las lecturas sensibles (reportes financieros, utilidad, costo, kardex, bitácora) tienen
    permisos propios: ver ventas no implica ver costos;
  - el frontend usa los mismos permisos para el menú y los guards, pero la autoridad es el
    backend.
- **Por qué:**
  - en Pro, las Policies existen y ningún controlador las llama (C2);
  - en Lite hubo reportes visibles para roles que no debían verlos (L-29).
- **Verifica:**
  - `Arquitectura/RutasConPermisoTest`: recorre las rutas y exige `permiso:*` salvo las
    `EXENTAS`;
  - `Permisos/MatrizPermisosTest`: matriz rol × endpoint (hoy `admin` y `vendedor`; cajero y
    supervisor se agregan cuando existan).
- **Desde:** Fase 1.

### SEG-04 · Sin HTML sin escapar
- **Regla:**
  - en Angular, prohibidos `[innerHTML]`, `bypassSecurityTrust*`, `ElementRef.nativeElement.innerHTML`
    y `document.write`;
  - el texto siempre va por interpolación;
  - el único contenido enriquecido permitido (por ejemplo, la plantilla de ticket editable) pasa
    por un sanitizador con una lista blanca, en un componente de `ui/print`;
  - la app se sirve con CSP (`default-src 'self'`, sin `unsafe-inline` en scripts).
- **Por qué:** el TPV de Lite armaba HTML con nombres de producto y cupones sin escapar (L-01).
- **Verifica:** ESLint (`@angular-eslint/template/no-inline-styles`, una regla propia
  `no-inner-html` y `no-restricted-syntax` para `bypassSecurityTrust`), bloqueante, y un test
  e2e con un producto llamado `<img src=x onerror=alert(1)>`.
- **Desde:** Fase 2.

### SEG-05 · Autorización de supervisor
- **Regla:**
  - las acciones que un vendedor no puede hacer solo (anular, descuento fuera de rango, abrir
    el cajón, cancelar un apartado) piden una autorización de supervisor;
  - el supervisor se autentica con su PIN o contraseña en `POST /v1/autorizaciones`, que
    devuelve un token **de un solo uso**, ligado a la acción y al recurso, con vida de 2 minutos;
  - la acción recibe el token, que se consume en la misma transacción;
  - el endpoint tiene un límite de intentos por usuario y terminal (5 en 10 minutos, después
    un bloqueo progresivo);
  - cada autorización, concedida o fallida, queda en la auditoría.
- **Por qué:** la clave de admin del TPV de Lite no tenía límite de intentos, y una validación
  aprobada servía para cualquier acción posterior (L-05).
- **Verifica:** tests del token (reutilizarlo → 422, otra acción → 422, expirado → 422) y del
  bloqueo después de N fallos.
- **Desde:** Fase 4.

### SEG-06 · Sesión y CSRF
- **Regla:**
  - la SPA usa Sanctum con cookie de sesión y XSRF por sesión, sin rotación por petición;
  - las impresiones y los iframes usan la misma sesión;
  - la inactividad la define el tenant (con un valor por defecto), y al expirar la API responde
    401 y el interceptor lleva al login (todas las pestañas);
  - en escritorio y LAN aplica lo mismo; nada de tokens en `localStorage`.
- **Por qué:** la rotación del token CSRF en cada POST de Lite rompía las impresiones en iframe
  y los formularios abiertos (L-11).
- **Verifica:** un test e2e con dos impresiones seguidas desde la misma pantalla y un test del
  interceptor con 401.
- **Desde:** Fase 2.

### SEG-07 · Secretos
- **Regla:**
  - contraseñas, llaves y tokens solo en `.env` o en el almacén de secretos del entorno;
  - la llave privada de licencias vive **solo** en el `Servidor_Licencias`, y la app embarca
    únicamente la pública;
  - lo que llegó al historial de git se considera expuesto y se rota.
- **Por qué:** es una regla heredada de Lite; con versiones de escritorio, el código llega a
  máquinas de terceros.
- **Verifica:** gitleaks (o equivalente) en CI y una búsqueda de `PRIVATE KEY` fuera del
  servidor de licencias.
- **Desde:** Fase 1.

### SEG-08 · Archivos fuera del docroot
- **Regla:**
  - respaldos, exportaciones, adjuntos y logs viven en `storage/`, fuera del directorio
    público;
  - se descargan por una ruta autenticada con permiso, que entrega el archivo;
  - nunca se publica un enlace directo a `storage/`;
  - los nombres de archivo los genera el servidor.
- **Por qué:** los respaldos de Lite estaban dentro del docroot y se podían descargar (L-12).
- **Verifica:** un test HTTP (`GET /storage/...` → 404) y un test de descarga sin permiso → 403.
- **Desde:** Fase 1, el 404 de `/storage` y la regla de arquitectura (nada de `Storage::url`
  ni disco `public`); el test de descarga sin permiso → 403, con la primera ruta de descarga
  (exportaciones en la Fase 6 o respaldos en la Fase 8).

### SEG-09 · Licencia
- **Regla:**
  - la licencia es un token firmado con RSA-SHA256, con el payload del tabulador: plan,
    features, límites, `soporte_hasta`, RFC y huella del equipo en las versiones locales;
  - la app verifica la firma con la llave pública, guarda la última verificación válida y
    tolera un periodo de gracia sin conexión;
  - detecta un reloj atrasado (una fecha menor a la última vista) y lo trata como licencia
    inválida;
  - una licencia vencida deja leer y exportar, pero no operar (cobrar, mover stock).
- **Por qué:** el modelo comercial depende de ella; en escritorio, el usuario controla el reloj
  y los archivos.
- **Verifica:** tests de firma alterada, de reloj atrasado, de gracia vencida y de una feature
  ausente en el payload.
- **Desde:** Fase 7.

### SEG-10 · Auditoría
- **Regla:**
  - las operaciones sensibles (anulaciones, autorizaciones, cambios de precio y de costo,
    ajustes de inventario, cambios de permisos, restauraciones) quedan en la auditoría con
    usuario, terminal, IP, antes y después;
  - se registra por configuración (`config/auditoria.php`, que se hereda de Pro), no con código
    en cada módulo;
  - no se registra una acción que no ocurrió.
- **Por qué:** en Lite, un registro protegido que se bloqueaba en el controlador dejaba en la
  bitácora una acción que no había ocurrido.
- **Verifica:** un test por operación sensible (la acción fallida no deja registro; la exitosa,
  sí).
- **Desde:** Fase 1.

### SEG-11 · Errores sin detalles internos
- **Regla:**
  - en producción, ninguna respuesta incluye SQL, trazas, rutas de archivo ni nombres de
    clase;
  - el detalle va al log con un id de correlación, y el usuario recibe `message` más
    `error_code` más ese id.
- **Por qué:** es la regla `ErrorDb` de Lite, llevada a la API.
- **Verifica:** un test con `APP_DEBUG=false` que provoca una excepción no controlada (→ 500 con
  el sobre estándar y sin traza).
- **Desde:** Fase 1.

### SEG-12 · PIN de caja
- **Regla:**
  - el PIN es una credencial **de la caja**, no de la cuenta: sirve para desbloquear una
    sesión ya abierta y para autorizar como supervisor (SEG-05); **nunca** reemplaza al login
    (contraseña más 2FA) ni permite cambiar de usuario en la terminal;
  - es opcional por usuario, de 4 a 6 dígitos según la configuración del tenant, se guarda
    con hash (`Hash::make`) y rechaza los PIN triviales (`0000`, `1234`, secuencias y
    repeticiones);
  - **bloqueo de pantalla del lado del servidor:**
    - por inactividad o a mano, la sesión queda en estado `bloqueada`;
    - toda la API responde 423 `sesion_bloqueada`, salvo `POST /v1/sesion/desbloquear`;
    - recargar la página no lo quita;
    - los tiempos de inactividad de la pantalla y de vida de la sesión se configuran por
      tenant;
  - límite de intentos por usuario y terminal (como SEG-05); al llegar al límite se cierra la
    sesión, y cada fallo queda en la auditoría (SEG-10);
  - cambiar el PIN propio pide la contraseña; cambiar o quitar el de otro usuario pide
    reautenticación con `dos-factor.reciente`; el admin puede quitar un PIN;
  - sin bypass por contraseña: el admin ya tiene 2FA;
  - la interfaz usa un solo componente de teclado de PIN (`libs/ui/forms`, UI-11) para el
    desbloqueo y la autorización.
- **Por qué:** en Lite (`docs/REPORTE_PIN_LITE.md`):
  - el bloqueo de pantalla era solo visual y se quitaba con F5 (P1);
  - el bypass de admin no tenía límite de intentos (P3);
  - los fallos de desbloqueo no dejaban rastro (P5);
  - los tiempos estaban fijos en el código (P6);
  - se aceptaban PIN como `0000` (P7);
  - el admin cambiaba el PIN de otro sin reautenticarse (P8);
  - el teclado estaba duplicado en dos vistas (P9).
- **Verifica:**
  - la API con la sesión bloqueada → 423, y sigue bloqueada después de recargar;
  - N fallos → sesión cerrada y registro en la auditoría;
  - un PIN trivial → 422;
  - cambiar el PIN de otro sin reautenticarse → 403;
  - un usuario sin PIN no ve el bloqueo.
- **Desde:** Fase 4. El componente, en la Fase 2.

## Excepciones

Ninguna acordada.
