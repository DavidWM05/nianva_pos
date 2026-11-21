<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Aplicacion\Idempotencia\Idempotencia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class IdempotenciaVentaTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_repetir_una_venta_devuelve_la_respuesta_original_y_rechaza_otra_carga(): void
    {
        $this->prepararNegocio(['ventas.crear']);
        $this->actingAs($this->usuario);
        $cabecera = ['Idempotency-Key' => (string) Str::ulid()];
        $carga = $this->payloadVenta();

        $original = $this->postJson('/api/v1/ventas', $carga, $cabecera)->assertCreated();
        $reintento = $this->postJson('/api/v1/ventas', $carga, $cabecera)->assertCreated();
        $this->assertSame($original->json(), $reintento->json());

        $this->postJson('/api/v1/ventas', $this->payloadVenta(['descuento_manual' => 1]), $cabecera)
            ->assertConflict();
        $this->assertDatabaseCount('ventas', 2);
    }

    public function test_una_llave_invalida_no_registra_la_venta(): void
    {
        $this->prepararNegocio(['ventas.crear']);
        $this->actingAs($this->usuario);
        $this->postJson('/api/v1/ventas', $this->payloadVenta(), ['Idempotency-Key' => 'invalida'])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'idempotencia_clave_invalida');
        $this->assertDatabaseCount('ventas', 1);
    }

    public function test_una_validacion_fallida_permite_reutilizar_la_llave_y_la_respuesta_expira(): void
    {
        $this->prepararNegocio(['ventas.crear']);
        $this->actingAs($this->usuario);
        $cabecera = ['Idempotency-Key' => (string) Str::ulid()];
        $carga = $this->payloadVenta();

        $this->postJson('/api/v1/ventas', [], $cabecera)->assertUnprocessable();
        $this->assertDatabaseCount('solicitudes_idempotentes', 0);
        $original = $this->postJson('/api/v1/ventas', $carga, $cabecera)->assertCreated();

        $this->travel(24)->hours();
        $nueva = $this->postJson('/api/v1/ventas', $carga, $cabecera)->assertCreated();
        $this->assertNotSame($original->json('data.id'), $nueva->json('data.id'));
        $this->assertDatabaseCount('ventas', 3);
        $this->assertDatabaseCount('solicitudes_idempotentes', 1);
    }

    public function test_las_mutaciones_de_dinero_tienen_el_mismo_middleware_despues_del_permiso(): void
    {
        $rutas = [
            'POST compras', 'POST caja/abrir', 'PATCH caja/caja/cerrar', 'POST ventas', 'PATCH ventas/venta/anular',
            'POST apartados', 'POST apartados/apartado/abonos', 'PATCH apartados/apartado/liquidar', 'PATCH apartados/apartado/cancelar',
            'POST devoluciones', 'POST gastos', 'POST cotizaciones/cotizacion/convertir',
            'POST cuentas-cobrar/cuenta/abonos', 'POST cuentas-cobrar/cuenta/anular',
            'POST cuentas-pagar/cuenta/pagos', 'POST cuentas-pagar/cuenta/anular',
            'POST gift-cards', 'POST gift-cards/tarjeta/recargar', 'POST gift-cards/tarjeta/cancelar',
            'POST ventas/venta/plan-pago', 'POST planes-pago-cliente/plan/pagar-cuota', 'POST prestamos/1/pagos',
        ];

        foreach ($rutas as $mutacion) {
            [$verbo, $ruta] = explode(' ', $mutacion, 2);
            $solicitud = Request::create('/api/v1/'.$ruta, $verbo);
            $middleware = Route::getRoutes()->match($solicitud)->gatherMiddleware();
            $autorizacion = collect($middleware)->search(static fn (string $clase): bool => str_starts_with($clase, 'permiso:'));
            $idempotencia = array_search(Idempotencia::class, $middleware, true);
            $this->assertNotFalse($autorizacion, $mutacion);
            $this->assertNotFalse($idempotencia, $mutacion);
            $this->assertGreaterThan($autorizacion, $idempotencia, $mutacion);
        }
    }
}
