<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('concurrencia')]
class FoliosConcurrentesTest extends TestCase
{
    public function test_dos_cajas_comparten_la_serie_y_un_rollback_no_deja_huecos(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $hijos = [];

        try {
            $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
            $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
            $metodo = MetodoPago::factory()->create(['tenant_id' => $tenant->id]);
            $usuarios = [];
            $variantes = [];
            for ($i = 0; $i < 2; $i++) {
                $usuarios[$i] = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
                $cajas[$i] = CajaSesion::factory()->create(['sucursal_id' => $sucursal->id, 'usuario_id' => $usuarios[$i]->id]);
                $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'precio_venta' => 100]);
                $variantes[$i] = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
                InventarioStock::factory()->create(['sucursal_id' => $sucursal->id, 'variante_id' => $variantes[$i]->id, 'stock_actual' => 1]);
            }

            $lecturaBloqueante = false;
            DB::listen(static function (QueryExecuted $consulta) use (&$lecturaBloqueante): void {
                $sql = strtolower($consulta->sql);
                if (str_starts_with($sql, 'select') && str_contains($sql, 'folio_contadores')) {
                    $lecturaBloqueante = str_contains($sql, 'for update') && $consulta->connection->transactionLevel() > 0;
                }
            });
            DB::beginTransaction();
            try {
                $venta = app(RegistrarVenta::class)->ejecutar(new CrearVentaDto(
                    clienteId: $cliente->id,
                    items: [new LineaVentaDto($variantes[0]->id, 1)],
                    pagos: [new PagoDto($metodo->id, 100.0)],
                    cuponCodigo: null,
                    descuentoManual: 0.0,
                    giftCardCodigo: null,
                    notaCreditoId: null,
                ), $usuarios[0], terminal: Terminal::sinTenant()->findOrFail($cajas[0]->terminal_id));
                $this->assertSame("V-{$sucursal->id}-1", $venta->folio);
                $this->assertTrue($lecturaBloqueante);
            } finally {
                DB::rollBack();
            }

            $serie = ['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'tipo' => 'V'];
            DB::table('folio_contadores')->insert($serie + ['ultimo' => 0]);
            DB::beginTransaction();
            try {
                DB::table('folio_contadores')->where($serie)->lockForUpdate()->sole();
                foreach ($usuarios as $i => $usuario) {
                    $hijos[] = ProcesosConcurrentes::iniciar('venta', [
                        'tenant' => $tenant->id, 'usuario' => $usuario->id, 'cliente' => $cliente->id,
                        'metodo' => $metodo->id, 'variante' => $variantes[$i]->id, 'terminal' => $cajas[$i]->terminal_id,
                    ]);
                }
                foreach ($hijos as $hijo) {
                    ProcesosConcurrentes::esperarBloqueo($hijo);
                }
            } finally {
                DB::commit();
            }

            foreach ($hijos as $hijo) {
                $this->assertSame(0, $hijo->wait(), $hijo->getErrorOutput().$hijo->getOutput());
                $eventos = ProcesosConcurrentes::eventos($hijo);
                $this->assertSame('venta', end($eventos)['resultado']);
            }

            $this->assertSame(
                ["V-{$sucursal->id}-1", "V-{$sucursal->id}-2"],
                Venta::query()->where('tenant_id', $tenant->id)->orderBy('folio')->pluck('folio')->all(),
            );
            $this->assertSame(2, (int) DB::table('folio_contadores')->where($serie)->value('ultimo'));
        } finally {
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::cerrar($hijo);
            }
            app(TenantContext::class)->set(null);
        }
    }
}
