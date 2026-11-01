<?php

use App\Modules\Apartados\Http\Controllers\ApartadoController;
use App\Modules\Auditoria\Http\Controllers\AuditoriaController;
use App\Modules\Configuracion\Http\Controllers\ConfiguracionController;
use App\Modules\Cotizaciones\Http\Controllers\CotizacionController;
use App\Modules\Crm\Http\Controllers\ClienteController;
use App\Modules\CrmAvanzado\Http\Controllers\CrmAvanzadoController;
use App\Modules\CuentasCobrar\Http\Controllers\CuentaCobrarController;
use App\Modules\CuentasPagar\Http\Controllers\CuentaPagarController;
use App\Modules\Delivery\Http\Controllers\PedidoController;
use App\Modules\Devoluciones\Http\Controllers\DevolucionController;
use App\Modules\Gastos\Http\Controllers\GastoController;
use App\Modules\GiftCards\Http\Controllers\GiftCardController;
use App\Modules\Inventario\Http\Controllers\CategoriaController;
use App\Modules\Inventario\Http\Controllers\CompraController;
use App\Modules\Inventario\Http\Controllers\DepartamentoController;
use App\Modules\Inventario\Http\Controllers\KardexController;
use App\Modules\Inventario\Http\Controllers\ProductoController;
use App\Modules\Inventario\Http\Controllers\ProductoVarianteController;
use App\Modules\Inventario\Http\Controllers\ProveedorController;
use App\Modules\NotasCredito\Http\Controllers\NotaCreditoController;
use App\Modules\Nucleo\Http\Controllers\ConfiguracionSeguridadController;
use App\Modules\Nucleo\Http\Controllers\DispositivosConfiablesController;
use App\Modules\Nucleo\Http\Controllers\InicioController;
use App\Modules\Nucleo\Http\Controllers\LicenciaLocalController;
use App\Modules\Nucleo\Http\Controllers\MetodoPagoController;
use App\Modules\Nucleo\Http\Controllers\PasswordResetController;
use App\Modules\Nucleo\Http\Controllers\PermisoController;
use App\Modules\Nucleo\Http\Controllers\RolController;
use App\Modules\Nucleo\Http\Controllers\SucursalController;
use App\Modules\Nucleo\Http\Controllers\TwoFactorController;
use App\Modules\Nucleo\Http\Controllers\UsuarioController;
use App\Modules\Nucleo\Http\Resources\UsuarioResource;
use App\Modules\Payroll\Http\Controllers\PayrollController;
use App\Modules\Precios\Http\Controllers\CuponController;
use App\Modules\Precios\Http\Controllers\ReglaPrecioController;
use App\Modules\Prestamos\Http\Controllers\PrestamoController;
use App\Modules\Produccion\Http\Controllers\ProduccionController;
use App\Modules\Tpv\Http\Controllers\CajaController;
use App\Modules\Tpv\Http\Controllers\VentaController;
use App\Modules\UnidadesMedida\Http\Controllers\UnidadMedidaController;
use App\Modules\VentasPlazos\Http\Controllers\PlanPagoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // El frontend llama esto tras login para saber quien es y decidir si
    // debe mostrar la pantalla de configuracion de 2FA -- por eso NO puede
    // estar detras de two-factor.confirmed (ver mas abajo).
    Route::get('/user', fn (Request $request) => new UsuarioResource($request->user()));

    // Escape hatch: si estas rutas estuvieran detras de two-factor.confirmed,
    // un admin sin 2FA configurado nunca podria terminar de configurarlo.
    Route::get('/two-factor/qr-code', [TwoFactorController::class, 'setup']);
    Route::post('/two-factor/confirm', [TwoFactorController::class, 'confirm']);

    // Accion sensible: dos-factor.reciente exige el TOTP de nuevo sin
    // importar si el dispositivo actual es uno ya confiado (ver
    // RequiereDosFactorReciente). Fuera de two-factor.confirmed a proposito,
    // igual que setup/confirm -- debe funcionar aunque el 2FA obligatorio
    // del rol todavia no este configurado.
    Route::post('/password/change', [PasswordResetController::class, 'cambiar'])->middleware('dos-factor.reciente');

    // Rutas de modulos reales (Inventario, TPV, etc.) van aqui cuando existan.
    Route::middleware('two-factor.confirmed')->group(function () {
        Route::get('/configuracion-seguridad', [ConfiguracionSeguridadController::class, 'show'])
            ->middleware('permiso:configuracion.ver');
        Route::put('/configuracion-seguridad', [ConfiguracionSeguridadController::class, 'update'])
            ->middleware('permiso:configuracion.editar');

        Route::get('/dispositivos-confiables', [DispositivosConfiablesController::class, 'index']);
        Route::delete('/dispositivos-confiables/{dispositivo}', [DispositivosConfiablesController::class, 'destroy']);
        Route::delete('/dispositivos-confiables', [DispositivosConfiablesController::class, 'destroyTodos']);

        // Cliente de licenciamiento: solo lectura, sin permiso especial --
        // cualquier usuario autenticado del tenant puede ver el estado de
        // su propia licencia. Activar/revalidar son CLI, no HTTP.
        Route::get('/licencia-local', [LicenciaLocalController::class, 'show']);

        // Inicio (Fase C, punto 4): resumen de ventas del dia + apartados
        // por vencer. reportes.ver, sembrado sin usarse hasta ahora.
        Route::get('/inicio/resumen', [InicioController::class, 'resumen'])->middleware('permiso:reportes.ver');

        // Administracion (Fase C): Usuarios/Roles/Permisos.
        Route::get('/usuarios', [UsuarioController::class, 'index'])->middleware('permiso:usuarios.ver');
        Route::post('/usuarios', [UsuarioController::class, 'store'])->middleware('permiso:usuarios.crear');
        Route::get('/usuarios/{usuario}', [UsuarioController::class, 'show'])->middleware('permiso:usuarios.ver');
        Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update'])->middleware('permiso:usuarios.editar');
        Route::patch('/usuarios/{usuario}/desactivar', [UsuarioController::class, 'desactivar'])
            ->middleware('permiso:usuarios.eliminar');
        // Reemplaza el autoservicio que existia en TwoFactorController::disable()
        // (eliminado) -- desactivar el 2FA de OTRO usuario ya no es
        // autoservicio, solo administracion. dos-factor.reciente aqui exige
        // el TOTP de quien ejecuta la accion (el admin), no del usuario
        // objetivo -- ver UsuarioController::desactivarDosFactor().
        Route::post('/usuarios/{usuario}/desactivar-2fa', [UsuarioController::class, 'desactivarDosFactor'])
            ->middleware(['permiso:usuarios.editar', 'dos-factor.reciente']);

        Route::get('/roles', [RolController::class, 'index'])->middleware('permiso:roles.ver');
        Route::post('/roles', [RolController::class, 'store'])->middleware('permiso:roles.crear');
        Route::get('/roles/{rol}', [RolController::class, 'show'])->middleware('permiso:roles.ver');
        Route::put('/roles/{rol}', [RolController::class, 'update'])->middleware('permiso:roles.editar');
        Route::delete('/roles/{rol}', [RolController::class, 'destroy'])->middleware('permiso:roles.eliminar');

        // Catalogo de permisos (para el checklist del formulario de Rol) --
        // mismo permiso que ver roles, no uno propio de "administrar permisos"
        // (ver PermisoController).
        Route::get('/permisos', [PermisoController::class, 'index'])->middleware('permiso:roles.ver');

        // Selector de sucursal del formulario de Usuario -- catalogo de
        // apoyo simple, mismo criterio que CategoriaController antes de su
        // CRUD (ver el reporte): sin CRUD propio, fuera de alcance de esta
        // fase, solo el listado que necesita el formulario.
        Route::get('/sucursales', [SucursalController::class, 'index'])->middleware('permiso:usuarios.ver');

        // CRM: primer modulo de negocio real conectado al shell.
        Route::get('/clientes', [ClienteController::class, 'index'])->middleware('permiso:clientes.ver');
        Route::post('/clientes', [ClienteController::class, 'store'])->middleware('permiso:clientes.crear');
        Route::get('/clientes/{cliente}', [ClienteController::class, 'show'])->middleware('permiso:clientes.ver');
        Route::put('/clientes/{cliente}', [ClienteController::class, 'update'])->middleware('permiso:clientes.editar');
        Route::patch('/clientes/{cliente}/desactivar', [ClienteController::class, 'desactivar'])
            ->middleware('permiso:clientes.eliminar');
        // Vive en el controlador de Tpv (no Crm) para no invertir la
        // dependencia Tpv->Crm ya establecida -- ver VentaController.
        Route::get('/clientes/{cliente}/ventas', [VentaController::class, 'porCliente'])
            ->middleware('permiso:clientes.ver');

        // Mismo permiso dedicado que el navegador global (ver AuditoriaController).
        Route::get('/auditoria', [AuditoriaController::class, 'index'])->middleware('permiso:auditoria.ver');
        // Navegador global (Fase C, punto 5) -- SI exige permiso dedicado
        // (ver AuditoriaController::global()). Ruta estatica ANTES de que
        // exista cualquier /auditoria/{id} (no existe hoy, pero mantiene
        // la convencion del resto de rutas nuevas).
        Route::get('/auditoria/global', [AuditoriaController::class, 'global'])->middleware('permiso:auditoria.ver');

        // Inventario: segundo modulo de negocio real. Categorias/departamentos
        // comparten el namespace de permisos inventario.* (ver CategoriaController).
        Route::get('/categorias', [CategoriaController::class, 'index'])->middleware('permiso:inventario.ver');
        Route::get('/categorias/{categoria}', [CategoriaController::class, 'show'])->middleware('permiso:inventario.ver');
        Route::post('/categorias', [CategoriaController::class, 'store'])->middleware('permiso:inventario.crear');
        Route::put('/categorias/{categoria}', [CategoriaController::class, 'update'])
            ->middleware('permiso:inventario.editar');
        Route::patch('/categorias/{categoria}/desactivar', [CategoriaController::class, 'desactivar'])
            ->middleware('permiso:inventario.eliminar');

        Route::get('/departamentos', [DepartamentoController::class, 'index'])->middleware('permiso:inventario.ver');
        Route::get('/departamentos/{departamento}', [DepartamentoController::class, 'show'])
            ->middleware('permiso:inventario.ver');
        Route::post('/departamentos', [DepartamentoController::class, 'store'])->middleware('permiso:inventario.crear');
        Route::put('/departamentos/{departamento}', [DepartamentoController::class, 'update'])
            ->middleware('permiso:inventario.editar');
        Route::patch('/departamentos/{departamento}/desactivar', [DepartamentoController::class, 'desactivar'])
            ->middleware('permiso:inventario.eliminar');

        Route::get('/productos', [ProductoController::class, 'index'])->middleware('permiso:inventario.ver');
        Route::post('/productos', [ProductoController::class, 'store'])->middleware('permiso:inventario.crear');
        Route::get('/productos/{producto}', [ProductoController::class, 'show'])->middleware('permiso:inventario.ver');
        Route::put('/productos/{producto}', [ProductoController::class, 'update'])->middleware('permiso:inventario.editar');
        Route::patch('/productos/{producto}/desactivar', [ProductoController::class, 'desactivar'])
            ->middleware('permiso:inventario.eliminar');

        Route::post('/productos/{producto}/variantes', [ProductoVarianteController::class, 'store'])
            ->middleware('permiso:inventario.crear');
        Route::put('/producto-variantes/{variante}', [ProductoVarianteController::class, 'update'])
            ->middleware('permiso:inventario.editar');
        Route::patch('/producto-variantes/{variante}/desactivar', [ProductoVarianteController::class, 'desactivar'])
            ->middleware('permiso:inventario.eliminar');

        Route::get('/producto-variantes/{variante}/kardex', [KardexController::class, 'porVariante'])
            ->middleware('permiso:inventario.ver');

        // Proveedores: catalogo de apoyo (necesario para registrar compras,
        // ver mas abajo) -- mismo permiso que el resto de catalogos de
        // Inventario, no uno dedicado.
        Route::get('/proveedores', [ProveedorController::class, 'index'])->middleware('permiso:inventario.ver');
        Route::post('/proveedores', [ProveedorController::class, 'store'])->middleware('permiso:inventario.crear');

        // Unica puerta HTTP hacia InventarioService::registrarCompra() --
        // antes no existia (ver el reporte del bug "no puedo ingresar
        // stock"). compras.ver/crear ya estaban en el catalogo de permisos
        // sembrado, sin usarse hasta ahora.
        Route::post('/compras', [CompraController::class, 'store'])->middleware('permiso:compras.crear');

        // Precios y Promociones: tercer modulo real.
        Route::get('/reglas-precio', [ReglaPrecioController::class, 'index'])->middleware('permiso:reglas_precio.ver');
        Route::get('/reglas-precio/{regla}', [ReglaPrecioController::class, 'show'])->middleware('permiso:reglas_precio.ver');
        Route::post('/reglas-precio', [ReglaPrecioController::class, 'store'])->middleware('permiso:reglas_precio.crear');
        Route::put('/reglas-precio/{regla}', [ReglaPrecioController::class, 'update'])
            ->middleware('permiso:reglas_precio.editar');
        Route::patch('/reglas-precio/{regla}/desactivar', [ReglaPrecioController::class, 'desactivar'])
            ->middleware('permiso:reglas_precio.eliminar');

        Route::get('/cupones', [CuponController::class, 'index'])->middleware('permiso:cupones.ver');
        Route::get('/cupones/{cupon}', [CuponController::class, 'show'])->middleware('permiso:cupones.ver');
        Route::post('/cupones', [CuponController::class, 'store'])->middleware('permiso:cupones.crear');
        Route::put('/cupones/{cupon}', [CuponController::class, 'update'])->middleware('permiso:cupones.editar');
        Route::patch('/cupones/{cupon}/desactivar', [CuponController::class, 'desactivar'])
            ->middleware('permiso:cupones.eliminar');
        // Parte del flujo de venta (TPV), no de la administracion del
        // catalogo de cupones -- ver el comentario en CuponController::validar().
        Route::post('/cupones/validar', [CuponController::class, 'validar'])->middleware('permiso:ventas.crear');

        // TPV: cuarto modulo real, el que junta Crm+Inventario+Precios en
        // un flujo de captura (ver VentaController/CajaController).
        // Metodos de pago vive en Nucleo (no Tpv) -- ver MetodoPagoController.
        Route::get('/metodos-pago', [MetodoPagoController::class, 'index'])->middleware('permiso:metodos_pago.ver');
        Route::get('/metodos-pago/{metodoPago}', [MetodoPagoController::class, 'show'])
            ->middleware('permiso:metodos_pago.ver');
        Route::post('/metodos-pago', [MetodoPagoController::class, 'store'])->middleware('permiso:metodos_pago.crear');
        Route::put('/metodos-pago/{metodoPago}', [MetodoPagoController::class, 'update'])
            ->middleware('permiso:metodos_pago.editar');
        Route::patch('/metodos-pago/{metodoPago}/desactivar', [MetodoPagoController::class, 'desactivar'])
            ->middleware('permiso:metodos_pago.eliminar');

        Route::get('/caja/actual', [CajaController::class, 'actual'])->middleware('permiso:caja.ver');
        Route::post('/caja/abrir', [CajaController::class, 'abrir'])->middleware('permiso:caja.abrir');
        Route::patch('/caja/{cajaSesion}/cerrar', [CajaController::class, 'cerrar'])->middleware('permiso:caja.cerrar');

        Route::get('/ventas', [VentaController::class, 'index'])->middleware('permiso:ventas.ver');
        Route::post('/ventas', [VentaController::class, 'store'])->middleware('permiso:ventas.crear');
        Route::post('/ventas/cotizar', [VentaController::class, 'cotizar'])->middleware('permiso:ventas.crear');
        Route::get('/ventas/reporte', [VentaController::class, 'reporte'])->middleware('permiso:reportes.ver');
        Route::get('/ventas/{venta}', [VentaController::class, 'show'])->middleware('permiso:ventas.ver');
        Route::patch('/ventas/{venta}/anular', [VentaController::class, 'anular'])->middleware('permiso:ventas.anular');

        // Apartados: quinto modulo real, reutiliza el mismo carrito/cotizacion
        // de TPV (ver ApartadoService, que depende de VentaService/InventarioService).
        // "liquidar" queda detras de apartados.abonar (no hay un permiso
        // apartados.liquidar dedicado en el catalogo sembrado -- liquidar es,
        // en esencia, cobrar el saldo final, el mismo gesto que abonar) para
        // que un vendedor pueda cerrar un apartado sin ser admin.
        Route::get('/apartados', [ApartadoController::class, 'index'])->middleware('permiso:apartados.ver');
        Route::post('/apartados', [ApartadoController::class, 'store'])->middleware('permiso:apartados.crear');
        Route::get('/apartados/{apartado}', [ApartadoController::class, 'show'])->middleware('permiso:apartados.ver');
        Route::post('/apartados/{apartado}/abonos', [ApartadoController::class, 'registrarAbono'])
            ->middleware('permiso:apartados.abonar');
        Route::patch('/apartados/{apartado}/liquidar', [ApartadoController::class, 'liquidar'])
            ->middleware('permiso:apartados.abonar');
        Route::patch('/apartados/{apartado}/cancelar', [ApartadoController::class, 'cancelar'])
            ->middleware('permiso:apartados.cancelar');

        // Devoluciones: sexto modulo real. Reutiliza VentaService (venta
        // sombra de un cambio) e InventarioService (ver DevolucionService) --
        // sin permiso propio de "cambio" vs "devolucion", el catalogo
        // sembrado solo tiene devoluciones.ver/crear para ambos casos.
        Route::get('/devoluciones', [DevolucionController::class, 'index'])->middleware('permiso:devoluciones.ver');
        Route::post('/devoluciones', [DevolucionController::class, 'store'])->middleware('permiso:devoluciones.crear');
        Route::get('/devoluciones/{devolucion}', [DevolucionController::class, 'show'])
            ->middleware('permiso:devoluciones.ver');

        // Gastos: septimo modulo real. Sin pantalla propia -- vive dentro
        // de la vista de caja de TPV (ver el reporte). index() siempre
        // exige caja_sesion_id (no pagina un historial general).
        Route::get('/gastos', [GastoController::class, 'index'])->middleware('permiso:gastos.ver');
        Route::post('/gastos', [GastoController::class, 'store'])->middleware('permiso:gastos.crear');

        // Configuracion (moneda, ticket, logo, backup): octavo modulo real.
        // Un solo permiso (configuracion.editar) gatea tanto ver como
        // editar -- a diferencia de configuracion-seguridad (ver/editar
        // separados), aqui no tiene sentido "ver pero no poder tocar"
        // estos ajustes.
        Route::get('/configuracion', [ConfiguracionController::class, 'show'])->middleware('permiso:configuracion.editar');
        Route::put('/configuracion', [ConfiguracionController::class, 'update'])->middleware('permiso:configuracion.editar');
        // Sin permiso dedicado a proposito -- ver el docblock de publica().
        Route::get('/configuracion/publica', [ConfiguracionController::class, 'publica']);

        // Unidades de Medida: catalogo de Inventario.
        Route::get('/unidades-medida', [UnidadMedidaController::class, 'index'])->middleware('permiso:inventario.ver');
        Route::post('/unidades-medida', [UnidadMedidaController::class, 'store'])->middleware('permiso:inventario.crear');
        Route::put('/unidades-medida/{id}', [UnidadMedidaController::class, 'update'])->middleware('permiso:inventario.editar');
        Route::delete('/unidades-medida/{id}', [UnidadMedidaController::class, 'destroy'])->middleware('permiso:inventario.eliminar');

        // Cotizaciones / Presupuestos
        Route::middleware('modulo:cotizaciones')->group(function () {
            Route::get('/cotizaciones', [CotizacionController::class, 'index'])->middleware('permiso:cotizaciones.ver');
            Route::post('/cotizaciones', [CotizacionController::class, 'store'])->middleware('permiso:cotizaciones.crear');
            Route::get('/cotizaciones/{cotizacion}', [CotizacionController::class, 'show'])->middleware('permiso:cotizaciones.ver');
            Route::put('/cotizaciones/{id}', [CotizacionController::class, 'update'])->middleware('permiso:cotizaciones.editar');
            Route::delete('/cotizaciones/{id}', [CotizacionController::class, 'destroy'])->middleware('permiso:cotizaciones.eliminar');
            Route::post('/cotizaciones/{id}/convertir', [CotizacionController::class, 'convertir'])->middleware('permiso:cotizaciones.convertir');
        });

        // Cuentas por Cobrar (CxC)
        Route::middleware('modulo:cxc')->group(function () {
            Route::get('/cuentas-cobrar', [CuentaCobrarController::class, 'index'])->middleware('permiso:cuentas_cobrar.ver');
            Route::get('/cuentas-cobrar/reporte', [CuentaCobrarController::class, 'reporte'])->middleware('permiso:reportes_cuentas_cobrar.ver');
            Route::get('/cuentas-cobrar/{cuentaCobrar}', [CuentaCobrarController::class, 'show'])->middleware('permiso:cuentas_cobrar.ver');
            Route::post('/cuentas-cobrar/{id}/abonos', [CuentaCobrarController::class, 'registrarAbono'])->middleware('permiso:cuentas_cobrar.registrar_abono');
            Route::post('/cuentas-cobrar/{id}/anular', [CuentaCobrarController::class, 'anular'])->middleware('permiso:cuentas_cobrar.anular');
        });

        // Cuentas por Pagar (CxP)
        Route::middleware('modulo:cxp')->group(function () {
            Route::get('/cuentas-pagar', [CuentaPagarController::class, 'index'])->middleware('permiso:cuentas_pagar.ver');
            Route::get('/cuentas-pagar/reporte', [CuentaPagarController::class, 'reporte'])->middleware('permiso:reportes_cuentas_pagar.ver');
            Route::get('/cuentas-pagar/{cuentaPagar}', [CuentaPagarController::class, 'show'])->middleware('permiso:cuentas_pagar.ver');
            Route::post('/cuentas-pagar/{id}/pagos', [CuentaPagarController::class, 'registrarPago'])->middleware('permiso:cuentas_pagar.registrar_pago');
            Route::post('/cuentas-pagar/{id}/anular', [CuentaPagarController::class, 'anular'])->middleware('permiso:cuentas_pagar.anular');
        });

        // CRM Avanzado (extension del modulo CRM existente)
        Route::middleware('modulo:crm_avanzado')->group(function () {
            Route::get('/clientes/{cliente}/interacciones', [CrmAvanzadoController::class, 'interacciones'])->middleware('permiso:crm_interacciones.ver');
            Route::post('/clientes/{cliente}/interacciones', [CrmAvanzadoController::class, 'crearInteraccion'])->middleware('permiso:crm_interacciones.crear');
            Route::get('/clientes/{cliente}/loyalty', [CrmAvanzadoController::class, 'loyalty'])->middleware('permiso:loyalty.ver');
            Route::post('/clientes/{cliente}/loyalty/ajustar', [CrmAvanzadoController::class, 'ajustarPuntos'])->middleware('permiso:loyalty.ajustar');
            Route::post('/crm/campanas/enviar', [CrmAvanzadoController::class, 'enviarCampana'])->middleware('permiso:crm_campanas.enviar');
            Route::get('/crm/reporte', [CrmAvanzadoController::class, 'reporte'])->middleware('permiso:reportes_crm.ver');
        });

        // Delivery / Pedidos
        Route::middleware('modulo:delivery')->group(function () {
            Route::get('/pedidos', [PedidoController::class, 'index'])->middleware('permiso:pedidos.ver');
            Route::post('/pedidos', [PedidoController::class, 'store'])->middleware('permiso:pedidos.crear');
            Route::get('/pedidos/{pedido}', [PedidoController::class, 'show'])->middleware('permiso:pedidos.ver');
            Route::patch('/pedidos/{id}/estado', [PedidoController::class, 'cambiarEstado'])->middleware('permiso:pedidos.cambiar_estado');
            Route::patch('/pedidos/{id}/repartidor', [PedidoController::class, 'asignarRepartidor'])->middleware('permiso:pedidos.asignar_repartidor');
        });

        // Gift Cards
        Route::middleware('modulo:gift_cards')->group(function () {
            Route::get('/gift-cards', [GiftCardController::class, 'index'])->middleware('permiso:gift_cards.ver');
            Route::post('/gift-cards', [GiftCardController::class, 'store'])->middleware('permiso:gift_cards.emitir');
            Route::get('/gift-cards/{giftCard}', [GiftCardController::class, 'show'])->middleware('permiso:gift_cards.ver');
            Route::post('/gift-cards/{id}/recargar', [GiftCardController::class, 'recargar'])->middleware('permiso:gift_cards.recargar');
            Route::post('/gift-cards/{id}/cancelar', [GiftCardController::class, 'cancelar'])->middleware('permiso:gift_cards.cancelar');
        });

        // Notas de Credito
        Route::middleware('modulo:notas_credito')->group(function () {
            Route::get('/notas-credito', [NotaCreditoController::class, 'index'])->middleware('permiso:notas_credito.ver');
            Route::get('/notas-credito/{notaCredito}', [NotaCreditoController::class, 'show'])->middleware('permiso:notas_credito.ver');
            Route::get('/clientes/{cliente}/notas-credito', [NotaCreditoController::class, 'activasPorCliente'])->middleware('permiso:notas_credito.ver');
        });

        // Produccion / Recetas
        Route::middleware('modulo:produccion')->group(function () {
            Route::get('/insumos', [ProduccionController::class, 'insumosIndex'])->middleware('permiso:produccion.ver');
            Route::post('/insumos', [ProduccionController::class, 'insumosStore'])->middleware('permiso:produccion.crear');
            Route::get('/insumos/{insumo}/stocks', [ProduccionController::class, 'insumoStocks'])->middleware('permiso:produccion.ver');
            Route::post('/insumos/{insumo}/stocks', [ProduccionController::class, 'insumoStocksStore'])->middleware('permiso:produccion.crear');
            Route::get('/recetas', [ProduccionController::class, 'recetasIndex'])->middleware('permiso:produccion.ver');
            Route::post('/recetas', [ProduccionController::class, 'recetasStore'])->middleware('permiso:produccion.crear');
            Route::get('/ordenes-produccion', [ProduccionController::class, 'ordenesIndex'])->middleware('permiso:produccion.ver');
            Route::post('/ordenes-produccion', [ProduccionController::class, 'ordenesStore'])->middleware('permiso:produccion.crear');
            Route::patch('/ordenes-produccion/{id}/estado', [ProduccionController::class, 'ordenesCambiarEstado'])->middleware('permiso:produccion.completar');
            Route::get('/transformaciones', [ProduccionController::class, 'transformacionesIndex'])->middleware('permiso:produccion.ver');
            Route::post('/transformaciones', [ProduccionController::class, 'transformacionStore'])->middleware('permiso:produccion.transformar');
        });

        // Ventas a Plazos (extension; depende de Tpv y Crm, no al reves)
        Route::middleware('modulo:ventas_plazos')->group(function () {
            Route::get('/planes-pago-cliente', [PlanPagoController::class, 'index'])->middleware('permiso:ventas_plazos.ver');
            Route::get('/planes-pago-cliente/{plan}', [PlanPagoController::class, 'show'])->middleware('permiso:ventas_plazos.ver');
            Route::post('/ventas/{venta}/plan-pago', [PlanPagoController::class, 'crearPlan'])->middleware('permiso:ventas_plazos.crear');
            Route::post('/planes-pago-cliente/{plan}/pagar-cuota', [PlanPagoController::class, 'pagarCuota'])->middleware('permiso:ventas_plazos.crear');
        });

        // Payroll / Nomina
        Route::middleware('modulo:payroll')->group(function () {
            Route::get('/empleados', [PayrollController::class, 'empleadosIndex'])->middleware('permiso:payroll.ver');
            Route::get('/empleados/{empleado}', [PayrollController::class, 'empleadosShow'])->middleware('permiso:payroll.ver');
            Route::post('/empleados', [PayrollController::class, 'empleadosStore'])->middleware('permiso:payroll.crear');
            Route::get('/nominas', [PayrollController::class, 'nominasIndex'])->middleware('permiso:payroll.ver');
            Route::get('/nominas/{nomina}', [PayrollController::class, 'nominasShow'])->middleware('permiso:payroll.ver');
            Route::post('/nominas/generar', [PayrollController::class, 'nominasGenerar'])->middleware('permiso:payroll.crear');
            Route::patch('/nominas/{id}/pagar', [PayrollController::class, 'nominasPagar'])->middleware('permiso:payroll.pagar');
        });

        // Prestamos
        Route::middleware('modulo:prestamos')->group(function () {
            Route::get('/prestamos', [PrestamoController::class, 'index'])->middleware('permiso:prestamos.ver');
            Route::get('/prestamos/{prestamo}', [PrestamoController::class, 'show'])->middleware('permiso:prestamos.ver');
            Route::post('/prestamos', [PrestamoController::class, 'store'])->middleware('permiso:prestamos.crear');
            Route::post('/prestamos/{id}/pagos', [PrestamoController::class, 'registrarPago'])->middleware('permiso:prestamos.pagar');
        });
    });
});
