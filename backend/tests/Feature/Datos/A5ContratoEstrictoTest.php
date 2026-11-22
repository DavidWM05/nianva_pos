<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Aplicacion\Idempotencia\Idempotencia;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class A5ContratoEstrictoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_una_mutacion_monetaria_sin_llave_no_registra_una_venta(): void
    {
        $this->prepararNegocio(['ventas.crear']);
        $this->actingAs($this->usuario);

        $this->sinLlave()->postJson('/api/v1/ventas', $this->payloadVenta())
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'idempotencia_clave_invalida');

        $this->assertDatabaseCount('ventas', 1);
        $this->assertDatabaseCount('solicitudes_idempotentes', 0);
    }

    public function test_las_22_mutaciones_sin_llave_rechazan_antes_de_persistir(): void
    {
        $rutas = collect(Route::getRoutes())->filter(
            fn ($ruta) => in_array(Idempotencia::class, $ruta->gatherMiddleware(), true),
        );
        $this->assertCount(22, $rutas);
        $permisos = $rutas->flatMap(fn ($ruta) => $ruta->gatherMiddleware())
            ->filter(fn ($middleware) => is_string($middleware) && str_starts_with($middleware, 'permiso:'))
            ->map(fn (string $middleware) => substr($middleware, strlen('permiso:')))
            ->unique()
            ->values()
            ->all();
        $this->prepararNegocio($permisos);
        $this->actingAs($this->usuario);
        // El objetivo es atravesar la ruta y sus permisos sin preparar 22 documentos de origen.
        $this->withoutMiddleware(SubstituteBindings::class);
        $tablas = array_column(Schema::getTables(), 'name');
        $conteos = fn (): array => array_combine($tablas, array_map(fn (string $tabla) => DB::table($tabla)->count(), $tablas));
        $antes = $conteos();

        foreach ($rutas as $ruta) {
            $uri = preg_replace('/\{[^}]+\}/', '1', $ruta->uri());
            $this->sinLlave()->json($ruta->methods()[0], '/'.$uri)
                ->assertUnprocessable()
                ->assertJsonPath('error_code', 'idempotencia_clave_invalida');
        }

        $this->assertSame($antes, $conteos());
        $this->assertDatabaseCount('solicitudes_idempotentes', 0);
    }

    public function test_un_reintento_confirmado_en_a4_oculta_los_numeros_sin_repetir_la_venta(): void
    {
        $this->prepararNegocio(['ventas.crear']);
        $this->actingAs($this->usuario);
        $llave = (string) Str::ulid();
        $cabecera = ['Idempotency-Key' => $llave];
        $cuerpo = $this->payloadVenta();
        $actual = $this->postJson('/api/v1/ventas', $cuerpo, $cabecera)->assertCreated()->json();
        $anterior = $actual;
        $anterior['data']['numero'] = 42;
        DB::table('solicitudes_idempotentes')->where('llave', strtolower($llave))
            ->update(['cuerpo' => json_encode($anterior, JSON_THROW_ON_ERROR)]);

        $this->postJson('/api/v1/ventas', $cuerpo, $cabecera)
            ->assertCreated()
            ->assertExactJson($actual);
        $this->assertDatabaseCount('ventas', 2);
    }

    public function test_el_reintento_de_una_nota_de_a4_publica_el_folio_de_la_devolucion(): void
    {
        $this->prepararNegocio(['devoluciones.crear']);
        $this->actingAs($this->usuario);
        $venta = $this->crearVenta();
        $llave = (string) Str::ulid();
        $cabecera = ['Idempotency-Key' => $llave];
        $cuerpo = [
            'venta_id' => $venta->ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'tipo_reembolso' => 'nota_credito',
        ];
        $devolucionesAntes = DB::table('devoluciones')->count();
        $notasAntes = DB::table('notas_credito')->count();
        $actual = $this->postJson('/api/v1/devoluciones', $cuerpo, $cabecera)->assertCreated()->json();
        $this->assertSame($actual['data']['folio'], $actual['nota_credito']['folio']);
        $anterior = $actual;
        $anterior['nota_credito']['numero'] = 42;
        unset($anterior['nota_credito']['folio']);
        DB::table('solicitudes_idempotentes')->where('llave', strtolower($llave))
            ->update(['cuerpo' => json_encode($anterior, JSON_THROW_ON_ERROR)]);

        $this->postJson('/api/v1/devoluciones', $cuerpo, $cabecera)->assertCreated()->assertExactJson($actual);
        $this->assertDatabaseCount('devoluciones', $devolucionesAntes + 1);
        $this->assertDatabaseCount('notas_credito', $notasAntes + 1);
    }

    public function test_los_umbrales_por_tenant_tienen_valores_de_lectura_y_se_pueden_editar(): void
    {
        $this->prepararNegocio(['configuracion.editar']);
        $this->actingAs($this->usuario);
        $this->assertDatabaseHas('configuracion_tenant', [
            'tenant_id' => $this->tenant->id,
            'margen_descuento_supervisor' => null,
            'umbral_descuadre_supervisor' => null,
        ]);
        $this->getJson('/api/v1/configuracion')->assertOk()
            ->assertJsonPath('data.margen_descuento_supervisor', '50.00')
            ->assertJsonPath('data.umbral_descuadre_supervisor', '100.00');

        $cuerpo = [
            'moneda' => 'MXN',
            'mostrar_rfc' => true,
            'mostrar_telefono' => true,
            'mostrar_correo' => true,
            'backup_auto' => false,
            'backup_frecuencia' => 'diario',
            'codigo_barras_automatico' => false,
        ];
        $this->putJson('/api/v1/configuracion', $cuerpo + [
            'margen_descuento_supervisor' => 0,
            'umbral_descuadre_supervisor' => '75.25',
        ])->assertOk()
            ->assertJsonPath('data.margen_descuento_supervisor', '0.00')
            ->assertJsonPath('data.umbral_descuadre_supervisor', '75.25');
        $this->putJson('/api/v1/configuracion', $cuerpo)->assertOk()
            ->assertJsonPath('data.margen_descuento_supervisor', '0.00')
            ->assertJsonPath('data.umbral_descuadre_supervisor', '75.25');
        $this->putJson('/api/v1/configuracion', $cuerpo + ['umbral_descuadre_supervisor' => -1])
            ->assertUnprocessable()->assertJsonValidationErrors('umbral_descuadre_supervisor');
        $this->assertDatabaseHas('configuracion_tenant', [
            'tenant_id' => $this->tenantB->id,
            'margen_descuento_supervisor' => null,
            'umbral_descuadre_supervisor' => null,
        ]);
    }

    public function test_el_uso_de_nota_publica_el_folio_guardado_de_su_venta(): void
    {
        $this->prepararNegocio(['notas_credito.ver']);
        $this->actingAs($this->usuario);
        $venta = $this->crearVenta();
        $venta->update(['folio' => 'V-1-70']);
        $devolucion = Devolucion::factory()->create(['venta_id' => $this->crearVenta()->id]);
        $nota = NotaCredito::factory()->create(['devolucion_id' => $devolucion->id, 'cliente_id' => $this->cliente->id]);
        NotaCreditoUso::factory()->create(['nota_credito_id' => $nota->id, 'venta_id' => $venta->id]);

        $this->getJson("/api/v1/notas-credito/{$nota->ulid}")->assertOk()
            ->assertJsonPath('data.usos.0.venta.folio', 'V-1-70')
            ->assertJsonMissingPath('data.usos.0.venta.numero');
    }

    public function test_una_anulacion_sin_token_requiere_supervisor_con_una_llave_valida(): void
    {
        $this->prepararNegocio(['ventas.anular']);
        $this->actingAs($this->usuario);
        $venta = $this->crearVenta();

        $this->patchJson("/api/v1/ventas/{$venta->ulid}/anular", [
            'motivo' => 'Operación duplicada',
        ], ['Idempotency-Key' => (string) Str::ulid()])
            ->assertForbidden()
            ->assertJsonPath('error_code', 'supervisor_requerido');

        $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'completada']);
        $this->assertDatabaseCount('solicitudes_idempotentes', 0);
    }
}
