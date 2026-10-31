<?php

namespace Tests\Feature\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Models\ApartadoAbonoPago;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Delivery\Models\PedidoItem;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Payroll\Models\Empleado;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Payroll\Models\NominaDetalle;
use App\Modules\Prestamos\Models\Prestamo;
use App\Modules\Prestamos\Models\PrestamoPago;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\RecetaIngrediente;
use App\Modules\Produccion\Models\TransformacionProducto;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaPago;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cuando el test pasa el tenant o la sucursal, la factory arma el resto de la
 * cadena en ese mismo tenant y no crea tenants de más (SEG-01).
 */
class FactoriesConDatosDadosTest extends TestCase
{
    use RefreshDatabase;

    public function test_venta_con_tenant_y_sucursal_dados_deja_toda_la_cadena_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $venta = Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);

        $this->assertSame($tenantsAntes, Tenant::count(), 'La factory creó tenants que no se usan.');
        $this->assertSame($tenant->id, Cliente::sinTenant()->findOrFail($venta->cliente_id)->tenant_id);
        $this->assertSame($tenant->id, Usuario::sinTenant()->findOrFail($venta->usuario_id)->tenant_id);
        $this->assertSame($sucursal->id, CajaSesion::query()->withoutGlobalScopes()->findOrFail($venta->caja_sesion_id)->sucursal_id);
    }

    public function test_apartado_con_tenant_y_sucursal_dados_deja_relaciones_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $apartado = Apartado::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($sucursal->id, $apartado->sucursal_id);
        $this->assertRelacionEnTenant(Cliente::class, $apartado->cliente_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $apartado->usuario_id, $tenant->id);
    }

    public function test_apartado_detalle_con_apartado_dado_crea_variante_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $apartado = Apartado::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $detalle = ApartadoDetalle::factory()->create(['apartado_id' => $apartado->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($apartado->id, $detalle->apartado_id);
        $this->assertVarianteEnTenant($detalle->variante_id, $tenant->id);
    }

    public function test_apartado_abono_con_apartado_dado_crea_usuario_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $apartado = Apartado::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $abono = ApartadoAbono::factory()->create(['apartado_id' => $apartado->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($apartado->id, $abono->apartado_id);
        $this->assertRelacionEnTenant(Usuario::class, $abono->usuario_id, $tenant->id);
    }

    public function test_apartado_abono_pago_con_abono_dado_crea_metodo_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $apartado = Apartado::factory()->create(['tenant_id' => $tenant->id]);
        $abono = ApartadoAbono::factory()->create(['apartado_id' => $apartado->id]);
        $tenantsAntes = Tenant::count();

        $pago = ApartadoAbonoPago::factory()->create(['abono_id' => $abono->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($abono->id, $pago->abono_id);
        $this->assertRelacionEnTenant(MetodoPago::class, $pago->metodo_pago_id, $tenant->id);
    }

    public function test_auditoria_con_tenant_dado_crea_usuario_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantsAntes = Tenant::count();

        $auditoria = Auditoria::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Usuario::class, $auditoria->usuario_id, $tenant->id);
    }

    public function test_caja_sesion_con_sucursal_dada_crea_usuario_en_el_tenant_de_la_sucursal(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $caja = CajaSesion::factory()->create(['sucursal_id' => $sucursal->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($sucursal->id, $caja->sucursal_id);
        $this->assertRelacionEnTenant(Usuario::class, $caja->usuario_id, $tenant->id);
    }

    public function test_compra_con_tenant_y_sucursal_dados_deja_relaciones_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $compra = Compra::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($sucursal->id, $compra->sucursal_id);
        $this->assertRelacionEnTenant(Proveedor::class, $compra->proveedor_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $compra->usuario_id, $tenant->id);
    }

    public function test_compra_detalle_con_compra_dada_crea_variante_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $compra = Compra::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $detalle = CompraDetalle::factory()->create(['compra_id' => $compra->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($compra->id, $detalle->compra_id);
        $this->assertVarianteEnTenant($detalle->variante_id, $tenant->id);
    }

    public function test_devolucion_con_venta_dada_deja_toda_la_cadena_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $devolucion = Devolucion::factory()->create(['venta_id' => $venta->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($venta->tenant_id, $devolucion->tenant_id);
        $this->assertSame($venta->sucursal_id, $devolucion->sucursal_id);
        $this->assertRelacionEnTenant(Usuario::class, $devolucion->usuario_id, $tenant->id);
    }

    public function test_devolucion_item_con_devolucion_dada_crea_variante_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id]);
        $devolucion = Devolucion::factory()->create(['venta_id' => $venta->id]);
        $tenantsAntes = Tenant::count();

        $item = DevolucionItem::factory()->create(['devolucion_id' => $devolucion->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($devolucion->id, $item->devolucion_id);
        $this->assertVarianteEnTenant($item->variante_id, $tenant->id);
    }

    public function test_devolucion_pago_con_devolucion_dada_crea_metodo_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id]);
        $devolucion = Devolucion::factory()->create(['venta_id' => $venta->id]);
        $tenantsAntes = Tenant::count();

        $pago = DevolucionPago::factory()->create(['devolucion_id' => $devolucion->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($devolucion->id, $pago->devolucion_id);
        $this->assertRelacionEnTenant(MetodoPago::class, $pago->metodo_pago_id, $tenant->id);
    }

    public function test_gasto_con_caja_dada_toma_sucursal_y_usuario_de_la_caja(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $caja = CajaSesion::factory()->create(['sucursal_id' => $sucursal->id]);
        $tenantsAntes = Tenant::count();

        $gasto = Gasto::factory()->create(['caja_sesion_id' => $caja->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($caja->id, $gasto->caja_sesion_id);
        $this->assertSame($caja->sucursal_id, $gasto->sucursal_id);
        $this->assertSame($caja->usuario_id, $gasto->usuario_id);
        $this->assertRelacionEnTenant(Usuario::class, $gasto->usuario_id, $tenant->id);
    }

    public function test_inventario_stock_con_sucursal_dada_crea_variante_en_el_tenant_de_la_sucursal(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $stock = InventarioStock::factory()->create(['sucursal_id' => $sucursal->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($sucursal->id, $stock->sucursal_id);
        $this->assertVarianteEnTenant($stock->variante_id, $tenant->id);
    }

    public function test_kardex_con_sucursal_dada_crea_variante_y_usuario_en_el_tenant_de_la_sucursal(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $kardex = Kardex::factory()->create(['sucursal_id' => $sucursal->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($sucursal->id, $kardex->sucursal_id);
        $this->assertVarianteEnTenant($kardex->variante_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $kardex->usuario_id, $tenant->id);
    }

    public function test_plan_pago_cliente_con_tenant_dado_crea_cliente_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantsAntes = Tenant::count();

        $plan = PlanPagoCliente::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Cliente::class, $plan->cliente_id, $tenant->id);
    }

    public function test_producto_con_tenant_dado_crea_categoria_y_departamento_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantsAntes = Tenant::count();

        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Categoria::class, $producto->categoria_id, $tenant->id);
        $this->assertRelacionEnTenant(Departamento::class, $producto->departamento_id, $tenant->id);
    }

    public function test_usuario_con_tenant_dado_crea_sucursal_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantsAntes = Tenant::count();

        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $sucursal = Sucursal::query()->withoutGlobalScopes()->findOrFail($usuario->sucursal_id);
        $this->assertSame($tenant->id, $sucursal->tenant_id);
    }

    public function test_venta_detalle_con_venta_dada_crea_variante_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $detalle = VentaDetalle::factory()->create(['venta_id' => $venta->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($venta->id, $detalle->venta_id);
        $this->assertVarianteEnTenant($detalle->variante_id, $tenant->id);
    }

    public function test_venta_pago_con_venta_dada_crea_metodo_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $pago = VentaPago::factory()->create(['venta_id' => $venta->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($venta->id, $pago->venta_id);
        $this->assertRelacionEnTenant(MetodoPago::class, $pago->metodo_pago_id, $tenant->id);
    }

    public function test_cotizacion_con_tenant_y_sucursal_dados_deja_relaciones_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $cotizacion = Cotizacion::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($sucursal->id, $cotizacion->sucursal_id);
        $this->assertRelacionEnTenant(Cliente::class, $cotizacion->cliente_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $cotizacion->usuario_id, $tenant->id);
    }

    public function test_cotizacion_detalle_con_cotizacion_dada_crea_variante_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $cotizacion = Cotizacion::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $detalle = CotizacionDetalle::factory()->create(['cotizacion_id' => $cotizacion->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($cotizacion->id, $detalle->cotizacion_id);
        $this->assertVarianteEnTenant($detalle->variante_id, $tenant->id);
    }

    public function test_cuenta_cobrar_con_venta_dada_deja_cliente_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $cuenta = CuentaCobrar::factory()->create([
            'tenant_id' => $tenant->id,
            'venta_id' => $venta->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Cliente::class, $cuenta->cliente_id, $tenant->id);
    }

    public function test_abono_cuenta_con_cuenta_dada_crea_usuario_y_metodo_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $cuenta = CuentaCobrar::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $abono = AbonoCuenta::factory()->create(['cuenta_cobrar_id' => $cuenta->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Usuario::class, $abono->usuario_id, $tenant->id);
        $this->assertRelacionEnTenant(MetodoPago::class, $abono->metodo_pago_id, $tenant->id);
    }

    public function test_cuenta_pagar_con_compra_dada_deja_proveedor_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $compra = Compra::factory()->create(['tenant_id' => $tenant->id, 'total' => 100]);
        $tenantsAntes = Tenant::count();

        $cuenta = CuentaPagar::factory()->create([
            'tenant_id' => $tenant->id,
            'compra_id' => $compra->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Proveedor::class, $cuenta->proveedor_id, $tenant->id);
    }

    public function test_abono_pagar_con_cuenta_dada_crea_usuario_y_metodo_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $cuenta = CuentaPagar::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $abono = AbonoPagar::factory()->create(['cuenta_pagar_id' => $cuenta->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Usuario::class, $abono->usuario_id, $tenant->id);
        $this->assertRelacionEnTenant(MetodoPago::class, $abono->metodo_pago_id, $tenant->id);
    }

    public function test_gift_card_con_tenant_dado_crea_cliente_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantsAntes = Tenant::count();

        $giftCard = GiftCard::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Cliente::class, $giftCard->cliente_id, $tenant->id);
    }

    public function test_gift_card_recarga_con_tarjeta_dada_crea_usuario_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $giftCard = GiftCard::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $recarga = GiftCardRecarga::factory()->create(['gift_card_id' => $giftCard->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Usuario::class, $recarga->usuario_id, $tenant->id);
    }

    public function test_nota_credito_con_devolucion_dada_deja_cliente_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id]);
        $devolucion = Devolucion::factory()->create(['venta_id' => $venta->id]);
        $tenantsAntes = Tenant::count();

        $nota = NotaCredito::factory()->create([
            'tenant_id' => $tenant->id,
            'devolucion_id' => $devolucion->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Cliente::class, $nota->cliente_id, $tenant->id);
        $this->assertRelacionEnTenant(Devolucion::class, $nota->devolucion_id, $tenant->id);
    }

    public function test_nota_credito_uso_con_nota_dada_crea_venta_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $nota = NotaCredito::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $uso = NotaCreditoUso::factory()->create(['nota_credito_id' => $nota->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Venta::class, $uso->venta_id, $tenant->id);
    }

    public function test_insumo_con_tenant_dado_crea_unidad_de_medida_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantsAntes = Tenant::count();

        $insumo = Insumo::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(UnidadMedida::class, $insumo->unidad_medida_id, $tenant->id);
    }

    public function test_insumo_stock_con_insumo_y_sucursal_dados_deja_la_cadena_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $insumo = Insumo::factory()->create(['tenant_id' => $tenant->id]);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $stock = InsumoStock::factory()->create([
            'insumo_id' => $insumo->id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($sucursal->id, $stock->sucursal_id);
        $this->assertRelacionEnTenant(Insumo::class, $stock->insumo_id, $tenant->id);
    }

    public function test_receta_con_tenant_y_variante_dados_deja_variante_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $tenantsAntes = Tenant::count();

        $receta = Receta::factory()->create([
            'tenant_id' => $tenant->id,
            'variante_id' => $variante->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($variante->id, $receta->variante_id);
    }

    public function test_receta_ingrediente_con_receta_dada_crea_insumo_y_unidad_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $receta = Receta::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $ingrediente = RecetaIngrediente::factory()->create(['receta_id' => $receta->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Insumo::class, $ingrediente->insumo_id, $tenant->id);
        $this->assertRelacionEnTenant(UnidadMedida::class, $ingrediente->unidad_medida_id, $tenant->id);
    }

    public function test_orden_produccion_con_tenant_y_receta_dados_deja_la_cadena_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $receta = Receta::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $orden = OrdenProduccion::factory()->create([
            'tenant_id' => $tenant->id,
            'receta_id' => $receta->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Receta::class, $orden->receta_id, $tenant->id);
        $this->assertRelacionEnTenant(Sucursal::class, $orden->sucursal_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $orden->usuario_id, $tenant->id);
    }

    public function test_transformacion_producto_con_tenant_y_sucursal_dados_deja_la_cadena_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $productoOrigen = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $productoDestino = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $origen = ProductoVariante::factory()->create(['producto_id' => $productoOrigen->id]);
        $destino = ProductoVariante::factory()->create(['producto_id' => $productoDestino->id]);
        $tenantsAntes = Tenant::count();

        $transformacion = TransformacionProducto::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'variante_origen_id' => $origen->id,
            'variante_destino_id' => $destino->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Sucursal::class, $transformacion->sucursal_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $transformacion->usuario_id, $tenant->id);
    }

    public function test_crm_interaccion_con_tenant_y_cliente_dados_crea_usuario_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $interaccion = CrmInteraccion::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Cliente::class, $interaccion->cliente_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $interaccion->usuario_id, $tenant->id);
    }

    public function test_crm_campana_con_tenant_y_usuario_dados_no_crea_tenants(): void
    {
        $tenant = Tenant::factory()->create();
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $campana = CrmCampana::factory()->create([
            'tenant_id' => $tenant->id,
            'usuario_id' => $usuario->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($tenant->id, $campana->tenant_id);
        $this->assertSame($usuario->id, $campana->usuario_id);
    }

    public function test_loyalty_transaccion_con_tenant_y_cliente_dados_no_crea_tenants(): void
    {
        $tenant = Tenant::factory()->create();
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $transaccion = LoyaltyTransaccion::factory()->create([
            'tenant_id' => $tenant->id,
            'cliente_id' => $cliente->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Cliente::class, $transaccion->cliente_id, $tenant->id);
    }

    public function test_pedido_con_tenant_sucursal_y_cliente_dados_crea_usuario_en_ese_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $pedido = Pedido::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'cliente_id' => $cliente->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Cliente::class, $pedido->cliente_id, $tenant->id);
        $this->assertRelacionEnTenant(Usuario::class, $pedido->usuario_id, $tenant->id);
    }

    public function test_pedido_item_con_pedido_dado_crea_variante_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $pedido = Pedido::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $item = PedidoItem::factory()->create(['pedido_id' => $pedido->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($pedido->id, $item->pedido_id);
        $this->assertVarianteEnTenant($item->variante_id, $tenant->id);
    }

    public function test_empleado_con_tenant_y_usuario_dados_toma_sucursal_del_usuario(): void
    {
        $tenant = Tenant::factory()->create();
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $empleado = Empleado::factory()->create([
            'tenant_id' => $tenant->id,
            'usuario_id' => $usuario->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($usuario->sucursal_id, $empleado->sucursal_id);
        $this->assertRelacionEnTenant(Usuario::class, $empleado->usuario_id, $tenant->id);
    }

    public function test_nomina_con_tenant_y_sucursal_dados_no_crea_tenants(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $nomina = Nomina::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($tenant->id, $nomina->tenant_id);
        $this->assertSame($sucursal->id, $nomina->sucursal_id);
    }

    public function test_nomina_detalle_con_nomina_dada_crea_empleado_en_el_tenant_del_padre(): void
    {
        $tenant = Tenant::factory()->create();
        $nomina = Nomina::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $detalle = NominaDetalle::factory()->create(['nomina_id' => $nomina->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Empleado::class, $detalle->empleado_id, $tenant->id);
    }

    public function test_prestamo_con_tenant_y_proveedor_dados_no_crea_tenants(): void
    {
        $tenant = Tenant::factory()->create();
        $proveedor = Proveedor::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $prestamo = Prestamo::factory()->create([
            'tenant_id' => $tenant->id,
            'proveedor_id' => $proveedor->id,
        ]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertRelacionEnTenant(Proveedor::class, $prestamo->proveedor_id, $tenant->id);
    }

    public function test_prestamo_pago_con_prestamo_dado_no_crea_tenants(): void
    {
        $tenant = Tenant::factory()->create();
        $prestamo = Prestamo::factory()->create(['tenant_id' => $tenant->id]);
        $tenantsAntes = Tenant::count();

        $pago = PrestamoPago::factory()->create(['prestamo_id' => $prestamo->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($prestamo->id, $pago->prestamo_id);
    }

    public function test_unidad_medida_con_tenant_dado_no_crea_tenants(): void
    {
        $tenant = Tenant::factory()->create();
        $tenantsAntes = Tenant::count();

        $unidad = UnidadMedida::factory()->create(['tenant_id' => $tenant->id]);

        $this->assertSame($tenantsAntes, Tenant::count());
        $this->assertSame($tenant->id, $unidad->tenant_id);
    }

    private function assertRelacionEnTenant(string $modelo, int $id, int $tenantId): void
    {
        $relacion = $modelo::query()->withoutGlobalScopes()->findOrFail($id);

        $this->assertSame($tenantId, $relacion->getAttribute('tenant_id'));
    }

    private function assertVarianteEnTenant(int $varianteId, int $tenantId): void
    {
        $variante = ProductoVariante::query()->withoutGlobalScopes()->findOrFail($varianteId);
        $producto = Producto::query()->withoutGlobalScopes()->findOrFail($variante->getAttribute('producto_id'));

        $this->assertSame($tenantId, $producto->getAttribute('tenant_id'));
    }
}
