<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Aplicacion\Libros\ConciliarLibros;
use App\Modules\CuentasCobrar\Models\CuentaCobrarMovimiento;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Exceptions\LibroInmutableException;
use App\Modules\Nucleo\Exceptions\ProyeccionNoActualizadaException;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaMovimiento;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Services\LibroCaja;
use App\Modules\VentasPlazos\Models\PlanPagoMovimiento;
use Database\Seeders\Escenarios\EscenariosSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * DAT-04 y DAT-05: libros de solo inserción con su proyección y saldo inicial explícito.
 */
class LibrosTest extends TestCase
{
    use RefreshDatabase;

    public function test_los_libros_de_los_datos_semilla_concilian(): void
    {
        $this->seed(EscenariosSeeder::class);

        $this->assertSame([], app(ConciliarLibros::class)->ejecutar());
        $this->artisan('conciliar:libros')->assertSuccessful();
        $this->assertGreaterThan(0, Kardex::query()->withoutGlobalScopes()->where('motivo', 'saldo_inicial')->count());
        $this->assertGreaterThan(0, CajaMovimiento::sinTenant()->where('tipo', 'saldo_inicial')->count());
    }

    public function test_la_conciliacion_reporta_un_libro_que_no_empieza_con_saldo_inicial_o_no_cuadra(): void
    {
        ['sucursal' => $sucursal, 'variante' => $variante] = $this->negocio();
        // Fila de stock creada a mano, sin libro: no tiene saldo inicial.
        InventarioStock::factory()->create(['sucursal_id' => $sucursal->id, 'variante_id' => $variante->id, 'stock_actual' => 4]);
        $caja = CajaSesion::factory()->create(['sucursal_id' => $sucursal->id, 'monto_apertura' => 50]);

        $hallazgos = app(ConciliarLibros::class)->ejecutar();

        $this->assertCount(2, $hallazgos);
        $this->assertStringContainsString('el primer movimiento no es saldo_inicial', $hallazgos[0]);
        $this->assertStringContainsString("caja_sesiones {$caja->id}", $hallazgos[1]);
        $this->artisan('conciliar:libros')->assertFailed();
    }

    public function test_el_primer_movimiento_de_una_variante_en_una_sucursal_es_el_saldo_inicial(): void
    {
        ['sucursal' => $sucursal, 'variante' => $variante, 'usuario' => $usuario] = $this->negocio();

        app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($variante->id, $sucursal->id, 'entrada', 3, 'ajuste', $usuario->id));

        $renglones = Kardex::query()->withoutGlobalScopes()->where('variante_id', $variante->id)->orderBy('id')->get();
        $this->assertSame(['saldo_inicial', 'ajuste'], $renglones->pluck('motivo')->all());
        $this->assertSame([0, 3], [$renglones[0]->stock_despues, $renglones[1]->stock_despues]);
        $this->assertSame((int) $usuario->id, (int) $renglones[0]->usuario_id);
        $this->assertSame([], app(ConciliarLibros::class)->ejecutar());
    }

    public function test_el_saldo_inicial_en_cero_existe_en_la_base_pero_no_sale_en_el_listado_del_kardex(): void
    {
        ['sucursal' => $sucursal, 'variante' => $variante, 'usuario' => $usuario] = $this->negocio();
        app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($variante->id, $sucursal->id, 'entrada', 3, 'ajuste', $usuario->id));

        $this->assertSame(1, Kardex::query()->withoutGlobalScopes()->where('variante_id', $variante->id)->where('motivo', 'saldo_inicial')->where('cantidad', 0)->count());
        $this->actingAs($usuario)->getJson("/api/v1/producto-variantes/{$variante->id}/kardex")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.motivo', 'ajuste');
    }

    public function test_si_la_proyeccion_de_stock_cambio_desde_que_se_leyo_el_movimiento_falla_y_no_escribe_el_libro(): void
    {
        ['sucursal' => $sucursal, 'variante' => $variante, 'usuario' => $usuario] = $this->negocio();
        $stock = InventarioStock::factory()->create(['sucursal_id' => $sucursal->id, 'variante_id' => $variante->id, 'stock_actual' => 10]);
        InventarioStock::query()->withoutGlobalScopes()->whereKey($stock->id)->update(['stock_actual' => 7]);

        try {
            DB::transaction(fn () => app(InventarioService::class)->registrarMovimientoConStock($stock, 'salida', 2, 'venta', $usuario->id));
            $this->fail('Se esperaba ProyeccionNoActualizadaException.');
        } catch (ProyeccionNoActualizadaException) {
        }

        $this->assertSame(7, $stock->fresh()?->stock_actual);
        $this->assertSame(0, Kardex::query()->withoutGlobalScopes()->where('variante_id', $variante->id)->count());
    }

    public function test_si_la_proyeccion_de_caja_cambio_desde_que_se_leyo_el_movimiento_falla(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->negocio();
        $caja = CajaSesion::factory()->create(['sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id, 'monto_apertura' => 50]);
        CajaSesion::query()->withoutGlobalScopes()->whereKey($caja->id)->update(['saldo_teorico' => 80]);

        $this->expectException(ProyeccionNoActualizadaException::class);
        DB::transaction(fn () => app(LibroCaja::class)->registrar($caja, 'venta', '20.00', 'ventas', 1, $usuario->id));
    }

    /** @return iterable<string, array{0: class-string<Model>, 1: string}> */
    public static function libros(): iterable
    {
        yield 'kardex' => [Kardex::class, 'stock_despues'];
        yield 'caja' => [CajaMovimiento::class, 'saldo_despues'];
        yield 'cuentas por cobrar' => [CuentaCobrarMovimiento::class, 'saldo_despues'];
        yield 'planes de pago' => [PlanPagoMovimiento::class, 'saldo_despues'];
        yield 'notas de credito' => [NotaCreditoUso::class, 'saldo_despues'];
    }

    /** @param class-string<Model> $clase */
    #[DataProvider('libros')]
    public function test_un_renglon_del_libro_no_se_actualiza_ni_se_borra(string $clase, string $saldo): void
    {
        $this->negocio();
        $renglon = $clase::factory()->create();

        try {
            $renglon->update([$saldo => 12345]);
            $this->fail('Se esperaba LibroInmutableException al actualizar.');
        } catch (LibroInmutableException) {
        }

        $this->expectException(LibroInmutableException::class);
        $renglon->delete();
    }

    /** @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, variante: ProductoVariante} */
    private function negocio(): array
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => 'inventario.ver'], ['modulo' => 'inventario', 'accion' => 'ver'])->id);
        $usuario->roles()->attach($rol->id);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);

        return compact('tenant', 'sucursal', 'usuario', 'variante');
    }
}
