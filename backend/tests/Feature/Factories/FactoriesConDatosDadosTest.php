<?php

namespace Tests\Feature\Factories;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Models\ApartadoAbonoPago;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaPago;
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
