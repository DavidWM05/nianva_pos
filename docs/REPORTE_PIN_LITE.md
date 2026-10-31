# Reporte técnico: PIN de acceso en Nianva POS Lite

> **Para:** la sesión que adapta la base nueva (`nianva_pos`).
> **Origen:** código de `C:\laragon\www\nianva_pos_lite`, commit `b105d4d` (2026-10-30). Solo describe; no se cambió nada.

## 1. Qué es el PIN en Lite

Es un código de **4 dígitos por usuario** con tres usos:
1. **Segundo paso del login:** después de la contraseña, si el usuario tiene PIN.
2. **Desbloqueo de pantalla:** por inactividad (15 min) o a mano desde el menú.
3. **No** se usa para autorizar acciones de supervisor. Eso lo hace `AdminAuth`, con usuario y contraseña del admin (TPV, caja, apartados, gastos, crédito).

El PIN es **opcional**: un usuario sin PIN entra solo con contraseña y nunca ve el bloqueo de pantalla.

## 2. Datos

| Elemento | Detalle |
|---|---|
| Columna | `usuarios.pin_hash VARCHAR(255) NULL` (`SchemaMigrator.php:912`). NULL = sin PIN |
| Hash | `password_hash($pin, PASSWORD_DEFAULT)` (bcrypt), en `Usuario::guardarPin` (`app/models/Usuario.php:205`) |
| Verificación | `Usuario::verificarPin($id, $pin)` (`Usuario.php:213`): exige `activo = 1` y `password_verify` |
| Formato | `^\d{4}$`, validado en el servidor (`Usuario::cambiarPinPropio` y `UsuarioController::guardarPin`) |
| Sesión | `$_SESSION['pin_pending_user_id']` (login a medias), `user_tiene_pin` (muestra el bloqueo y la opción del menú) y `_screen_lock_fails` (intentos fallidos al desbloquear) |
| Intentos | `LoginThrottle` con la clave `pin:{userId}` (5 fallos → 5 min de bloqueo por usuario; además, 20 fallos por IP → 15 min). El desbloqueo de pantalla **no** usa `LoginThrottle`, sino un contador en sesión |
| Bitácora | `sistema_logs` (`AuthController::_logAuth` y `SistemaLog::registrar`): PIN fallido, PIN bloqueado, bypass de admin, PIN configurado |

## 3. Flujos

### 3.1 Login con PIN (`AuthController`)

```
POST /auth/acceder (usuario + contraseña)
 ├─ LoginThrottle bloqueado → /auth/index?error=blocked&min=N
 ├─ contraseña incorrecta → recordFailure → /auth/index?error=true
 └─ correcta → clearFailures, session_regenerate_id(true)
      $_SESSION['pin_pending_user_id'] = id      ← sesión INCOMPLETA (sin user_id)
      ├─ debe_cambiar_clave → vista cambiar_clave (3.4)
      ├─ sin pin_hash → _completarSesion() → /home/index
      └─ con pin_hash → vista auth/pin.php (teclado)
            POST /auth/verificarPin (pin)
             ├─ LoginThrottle('pin:id') bloqueado → borra pending → /auth/index?error=blocked
             ├─ PIN correcto → clearFailures, borra pending, recarga usuario (activo) → _completarSesion()
             └─ PIN incorrecto → recordFailure('pin:id') → /auth/pin?error=pin
```

- **`_completarSesion()`** (`AuthController.php:342`): llena `user_id`, `user_nombre`, `user_rol`, `sucursal_id`, `sucursal_nombre`, `user_tiene_pin`, `sucursal_modo` y `sucursal_nombre_comercial`; deja el login en la bitácora y redirige a `/home/index`.
- **Mientras exista `pin_pending_user_id` sin `user_id`**, `BaseController` trata la sesión como no autenticada: no se puede entrar a ninguna pantalla.
- **Vista `auth/pin.php`:**
  - teclado visual de 3×4 más teclado físico (0-9 y Backspace);
  - cuatro puntos indicadores;
  - al cuarto dígito, envía solo un formulario oculto (`pinForm`);
  - **no hay `<input type="password">`**, a propósito, para que el navegador no lo autocomplete;
  - enlaces "Volver al inicio de sesión" y, si el rol pendiente es admin, "Soy administrador — ingresar con contraseña" (3.2);
  - paleta de colores por empresa (`config/paletas.php`, `empresa.login_paleta`).
- **`GET /auth/pin`** vuelve a mostrar el teclado si hay un pendiente activo; si no, manda al login.

### 3.2 Bypass de admin ("ingresar con contraseña")

```
GET  /auth/adminBypassPin      (solo si el pendiente es admin y activo)
POST /auth/procesarAdminBypass (CSRF + contraseña)
 ├─ contraseña incorrecta → vuelve a mostrar el formulario
 └─ correcta → borra pending, bitácora "Admin bypass PIN" (warning) → _completarSesion()
```

- **Para qué existe:** que un admin que olvidó su PIN no quede fuera del sistema.

### 3.3 Bloqueo de pantalla (`layouts/screen_lock.php` + `public/js/screen-lock.js`)

- **Se incluye** en `layouts/app.php`, así que aparece en toda vista con menú, **solo si** `user_tiene_pin`.
- **Se dispara de dos formas:**
  - inactividad de **900 s** (fijo en `screen_lock.php:11`), contando `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll` y `click`;
  - a mano, desde el menú de usuario: "Bloquear pantalla" (`menu_items.php:375`, `SL.lock()`).
- **Al bloquearse:** se muestra una capa a pantalla completa con desenfoque, con nombre, rol y teclado; el foco y las teclas quedan atrapados en la capa (fase de captura; Tab bloqueado).
- **Al llegar al cuarto dígito:** `fetch POST /auth/desbloquearPantalla` con `pin` y `_csrf_token`, más el encabezado `X-Requested-With`.

```
desbloquearPantalla
 ├─ sin user_id → 401 {reload} (el JS lleva al login)
 ├─ CSRF inválido → 403 (se valida SIN rotar: hay formularios abiertos debajo)
 ├─ _screen_lock_fails >= 5 → session_destroy → {logout:true} → recarga → login
 ├─ PIN correcto → fails = 0 → {ok:true} → se oculta la capa y se reinicia el temporizador
 └─ PIN incorrecto → fails + 1 → {ok:false} → "PIN incorrecto."
```

- **Relación con la sesión del servidor:** son dos relojes distintos.
  - `BaseController::INACTIVIDAD_SEG = 7200` (2 h) cierra la sesión del servidor; una petición AJAX recibe 401 con `expired` y `redirect`.
  - El bloqueo (15 min) es **solo de interfaz**: la sesión del servidor sigue viva.

### 3.4 Cambio de contraseña forzado y PIN

- Si `debe_cambiar_clave` (por ejemplo, después de un reseteo del admin), el login muestra `cambiar_clave.php` **antes** del PIN.
- `procesarCambioForzado`:
  - valida al menos 8 caracteres y que coincida la confirmación, y llama `forzarClave`;
  - después, si tiene PIN → teclado (3.1); si no, `_completarSesion()`.

### 3.5 Alta y cambio del PIN

| Quién | Dónde | Reglas |
|---|---|---|
| El propio usuario | Mi perfil → `PerfilController::guardarPin` → `Usuario::cambiarPinPropio` | CSRF; **pide la contraseña actual**; PIN de 4 dígitos y confirmación igual; actualiza `user_tiene_pin`; bitácora |
| Admin, para cualquier usuario | Usuarios → `UsuarioController::guardarPin` (modal `configurarPin`) | CSRF; PIN de 4 dígitos; **no pide la contraseña del admin**; bitácora "PIN configurado para usuario #X por admin #Y" |
| Admin: desbloquear intentos | Usuarios → `UsuarioController::limpiarIntentos` | Limpia `LoginThrottle` del usuario **y** de `pin:{id}`; bitácora |

- **No existe "quitar PIN":** una vez configurado, solo se puede cambiar, no volver a NULL desde la interfaz.

## 4. Debilidades encontradas (no repetirlas en la base nueva)

| # | Problema | Dónde | Impacto |
|---|---|---|---|
| P1 | **El bloqueo de pantalla es solo visual.** Al recargar la página (F5) la capa desaparece, porque el estado `locked` vive en JS; mientras está bloqueada, las peticiones al servidor siguen funcionando, y quitar la capa desde DevTools la deshace | `screen-lock.js`, `screen_lock.php` | Cualquiera en la caja desbloquea sin PIN |
| P2 | `verificarPin` del login **no valida CSRF**, aunque el formulario manda el token | `AuthController::verificarPin` | Bajo: requiere un pendiente en la misma sesión |
| P3 | El bypass de admin **no tiene límite de intentos** y, si la contraseña falla, **no muestra el error**: la vista lee `$_GET['error']`, pero el controlador hace `require` sin redirigir | `procesarAdminBypass`, `admin_bypass_pin.php:3` | Fuerza bruta sin freno; mala experiencia |
| P4 | Para un admin, el PIN **no es un segundo factor real**: el bypass pide la misma contraseña que ya escribió | Flujo 3.2 | El PIN del admin no agrega seguridad |
| P5 | Los fallos de desbloqueo viven en `$_SESSION`; tras 5 se cierra la sesión, pero no quedan en la bitácora ni en `LoginThrottle` | `desbloquearPantalla` | Sin rastro de intentos |
| P6 | Tiempos fijos en el código: 900 s de bloqueo y 7200 s de sesión | `screen_lock.php:11`, `BaseController.php:13` | El negocio no puede configurarlos |
| P7 | Un PIN de 4 dígitos sin reglas: permite `0000` o `1234`, y no impide repetir el anterior | `cambiarPinPropio`, `guardarPin` | Fácil de adivinar en la caja |
| P8 | El admin cambia el PIN de otro sin reautenticarse, y no se puede quitar un PIN | `UsuarioController::guardarPin` | Toma de cuentas si la sesión de un admin queda abierta |
| P9 | El teclado y los estilos del PIN están **duplicados** en `pin.php` y `screen_lock.php` (CSS, JS, paleta) | Dos vistas y dos scripts | Ya divergieron (por ejemplo, la clase `pin-icon` faltaba) |

## 5. Qué hay hoy en la base nueva (`nianva_pos`)

- **No tiene PIN ni bloqueo de pantalla.** La búsqueda de `pin_hash`, PIN, bloqueo e inactividad en backend y frontend no encontró nada relacionado.
- **Sí tiene 2FA con TOTP** (Nucleo):
  - `TwoFactorService`, `TwoFactorController` y las columnas `two_factor_*` en `usuarios`;
  - el middleware `two-factor.confirmed` (`EnsureTwoFactorIsConfigured`), que obliga a configurarlo;
  - el middleware `dos-factor.reciente` (`RequiereDosFactorReciente`), que vuelve a pedir el código TOTP para acciones sensibles;
  - `throttle:two-factor` en `/login/2fa-verify`;
  - "recordar dispositivo", que omite el 2FA solo en el login.
- **Autorización de supervisor:** no existe como flujo propio. El estándar **SEG-05** (`docs/estandares/03_seguridad.md`) ya la define: `POST /v1/autorizaciones` → token de un solo uso, ligado a la acción y al recurso, con 2 min de vida, límite de intentos y auditoría.

## 6. Recomendación para adaptarlo (para decidir en la otra sesión)

1. **Separar tres conceptos** que en Lite se mezclan:
   - **Autenticación** (contraseña más 2FA TOTP, lo que ya tiene Nucleo).
   - **Desbloqueo rápido en la caja** (PIN): no reemplaza el login, solo reanuda una sesión ya abierta.
   - **Autorización de supervisor** (SEG-05): PIN o contraseña **del supervisor** → token de un solo uso.
2. **Bloqueo de pantalla del lado del servidor:**
   - al bloquear (por inactividad o a mano), la sesión queda en estado `bloqueada` (en la sesión de Sanctum, o en la terminal y su sesión de caja);
   - toda la API responde 423 `sesion_bloqueada`, salvo `POST /v1/sesion/desbloquear`;
   - el interceptor del frontend muestra la capa del PIN;
   - una recarga no lo salta (corrige P1).
3. **Intentos y bitácora:**
   - límite de Laravel por usuario y terminal en desbloqueo, login con PIN y autorización;
   - tras N fallos se cierra la sesión y queda en la auditoría (corrige P3 y P5).
4. **PIN como credencial de la caja:**
   - de 4 a 6 dígitos según la configuración del tenant;
   - lista de PIN triviales prohibidos;
   - cambiarlo pide la contraseña (si es propio) o reautenticación del admin con `dos-factor.reciente` (si es de otro);
   - el admin puede **quitar** un PIN (corrige P7 y P8).
5. **Admin:** con 2FA TOTP, el bypass por contraseña ya no hace falta; se elimina (corrige P4).
6. **Tiempos configurables** por tenant: inactividad de la interfaz y vida de la sesión (corrige P6).
7. **Un solo componente** `ui-input-pin` / `ui-pin-pad` en `libs/ui/forms` (UI-11), usado por el login con PIN, el bloqueo y la autorización de supervisor, con soporte de teclado y modo táctil (corrige P9).
8. **Tests mínimos:**
   - reutilizar un token de autorización → 422;
   - la API con la sesión bloqueada → 423;
   - recargar la página sigue bloqueado;
   - N fallos → bloqueo y registro en la auditoría;
   - un usuario sin PIN no ve el bloqueo, o bien se exige PIN por configuración;
   - cambiar el PIN de otro sin reautenticarse → 403.

## 7. Archivos de Lite citados

- `app/controllers/AuthController.php`: `acceder`, `verificarPin`, `pin`, `adminBypassPin`, `procesarAdminBypass`, `desbloquearPantalla`, `procesarCambioForzado`, `_completarSesion`.
- `app/controllers/PerfilController.php::guardarPin`, `app/controllers/UsuarioController.php::guardarPin` y `::limpiarIntentos`.
- `app/models/Usuario.php`: `guardarPin`, `verificarPin`, `cambiarPinPropio`.
- `app/core/LoginThrottle.php`, `app/core/BaseController.php` (`INACTIVIDAD_SEG`).
- `app/views/auth/pin.php`, `admin_bypass_pin.php`, `cambiar_clave.php`.
- `app/views/layouts/screen_lock.php`, `public/js/screen-lock.js`, `app/views/layouts/menu_items.php:373`.
- `app/config/paletas.php` (claves `pin` y `screen_lock`).

