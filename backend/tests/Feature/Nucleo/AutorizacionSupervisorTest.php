<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class AutorizacionSupervisorTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_la_autorizacion_se_liga_a_la_venta_y_solo_se_consume_una_vez(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $this->prepararNegocio(['caja.ver', 'ventas.anular']);
        $supervisor = Usuario::factory()->admin()->create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
        ]);
        $supervisor->forceFill(['pin_caja_hash' => Hash::make('7049')])->save();
        $venta = $this->crearVenta();
        $ruta = "/api/v1/ventas/{$venta->ulid}/anular";
        $datos = ['motivo' => 'Operación duplicada'];

        $this->actingAs($this->usuario);
        $this->patchJson($ruta, $datos)->assertForbidden()->assertJsonPath('error_code', 'supervisor_requerido');

        $token = $this->postJson('/api/v1/autorizaciones', [
            'supervisor_id' => $supervisor->id,
            'pin' => '7049',
            'accion' => 'ventas.anular',
            'recurso' => $venta->ulid,
            'datos' => $datos,
        ])->assertCreated()->json('data.token');

        $this->assertDatabaseHas('autorizaciones_supervisor', ['token_hash' => hash('sha256', $token)]);
        $this->assertDatabaseMissing('autorizaciones_supervisor', ['token_hash' => $token]);

        $cabeceras = ['X-Autorizacion-Supervisor' => $token];
        $this->patchJson($ruta, ['motivo' => 'Otro motivo'], $cabeceras)
            ->assertForbidden()->assertJsonPath('error_code', 'supervisor_invalido');
        $conLlave = $cabeceras + ['Idempotency-Key' => (string) Str::ulid()];
        $original = $this->patchJson($ruta, $datos, $conLlave)->assertOk()->assertJsonPath('data.estado', 'anulada');
        $repetida = $this->patchJson($ruta, $datos, $conLlave)->assertOk();
        $this->assertSame($original->json(), $repetida->json());
        $this->patchJson($ruta, $datos, $cabeceras)
            ->assertForbidden()->assertJsonPath('error_code', 'supervisor_invalido');
    }

    public function test_el_descuento_superior_al_margen_requiere_token_y_un_fallo_revierte_su_consumo(): void
    {
        $supervisor = $this->prepararSupervisor(['caja.ver', 'ventas.crear']);
        ConfiguracionTenant::actual()->update(['margen_descuento_supervisor' => '5.00']);
        $datos = $this->payloadVenta(['descuento_manual' => 10]);
        $this->postJson('/api/v1/ventas', $datos)->assertForbidden()->assertJsonPath('error_code', 'supervisor_requerido');

        $token = $this->emitirPara($supervisor, 'ventas.descuento', null, $datos);
        $this->postJson('/api/v1/ventas', $datos, ['X-Autorizacion-Supervisor' => $token])->assertUnprocessable();
        $this->assertDatabaseHas('autorizaciones_supervisor', ['token_hash' => hash('sha256', $token), 'consumida_en' => null]);

        $datos['pagos'][0]['monto'] = 90;
        $token = $this->emitirPara($supervisor, 'ventas.descuento', null, $datos);
        $this->postJson('/api/v1/ventas', $datos, ['X-Autorizacion-Supervisor' => $token])
            ->assertCreated()->assertJsonPath('data.descuento_manual', '10.00');
    }

    public function test_el_cierre_con_descuadre_y_la_cancelacion_de_apartado_exigen_autorizacion(): void
    {
        $supervisor = $this->prepararSupervisor(['caja.ver', 'caja.cerrar', 'apartados.cancelar']);
        $apartado = $this->crearApartado();
        $datos = ['motivo' => 'Solicitud del cliente'];
        $ruta = "/api/v1/apartados/{$apartado->ulid}/cancelar";

        $this->patchJson($ruta, $datos)->assertForbidden()->assertJsonPath('error_code', 'supervisor_requerido');
        $token = $this->emitirPara($supervisor, 'apartados.cancelar', $apartado->ulid, $datos);
        $this->patchJson($ruta, $datos, ['X-Autorizacion-Supervisor' => $token])->assertOk();

        ConfiguracionTenant::actual()->update(['umbral_descuadre_supervisor' => '5.00']);
        $datos = ['conteos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 10]]];
        $ruta = "/api/v1/caja/{$this->caja->ulid}/cerrar";
        $this->patchJson($ruta, $datos)->assertForbidden()->assertJsonPath('error_code', 'supervisor_requerido');
        $this->assertSame('abierta', $this->caja->refresh()->estado);
        $token = $this->emitirPara($supervisor, 'caja.cerrar', $this->caja->ulid, $datos);
        $this->patchJson($ruta, $datos, ['X-Autorizacion-Supervisor' => $token])
            ->assertOk()->assertJsonPath('data.diferencia', '-490.00');
    }

    public function test_el_reembolso_en_dinero_exige_token_y_respeta_su_vencimiento(): void
    {
        $supervisor = $this->prepararSupervisor(['caja.ver', 'devoluciones.crear']);
        $venta = $this->crearVenta();
        $datos = [
            'venta_id' => $venta->ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        ];
        $ruta = '/api/v1/devoluciones';
        $this->postJson($ruta, $datos)->assertForbidden()->assertJsonPath('error_code', 'supervisor_requerido');
        $token = $this->emitirPara($supervisor, 'devoluciones.reembolsar', $venta->ulid, $datos);
        $this->travel(2)->minutes();
        $this->postJson($ruta, $datos, ['X-Autorizacion-Supervisor' => $token])->assertForbidden()
            ->assertJsonPath('error_code', 'supervisor_invalido');
        $token = $this->emitirPara($supervisor, 'devoluciones.reembolsar', $venta->ulid, $datos);
        $this->postJson($ruta, $datos, ['X-Autorizacion-Supervisor' => $token])->assertCreated();
    }

    public function test_limita_y_audita_los_intentos_sin_guardar_el_pin(): void
    {
        $supervisor = $this->prepararSupervisor(['caja.ver', 'ventas.anular']);
        $venta = $this->crearVenta();
        $solicitud = [
            'supervisor_id' => $supervisor->id, 'pin' => '9009', 'accion' => 'ventas.anular',
            'recurso' => $venta->ulid, 'datos' => ['motivo' => 'Error'],
        ];
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/autorizaciones', $solicitud)
                ->assertForbidden()->assertJsonPath('error_code', 'supervisor_invalido');
        }

        $this->postJson('/api/v1/autorizaciones', array_replace($solicitud, ['pin' => '7049']))
            ->assertTooManyRequests()->assertJsonPath('error_code', 'supervisor_intentos_agotados');
        $this->assertDatabaseCount('autorizaciones_supervisor', 0);
        $this->assertSame(5, DB::table('auditoria')->where('tabla_afectada', 'autorizaciones_supervisor')
            ->where('cambios->resultado', 'rechazada')->count());
    }

    public function test_un_pin_correcto_no_sustituye_el_permiso_del_supervisor_para_la_accion(): void
    {
        $this->prepararSupervisor(['caja.ver', 'ventas.anular']);
        $candidato = Usuario::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id]);
        $candidato->forceFill(['pin_caja_hash' => Hash::make('7049')])->save();
        $this->darPermisosA($candidato, ['supervisor.autorizar']);
        $venta = $this->crearVenta();

        $this->postJson('/api/v1/autorizaciones', [
            'supervisor_id' => $candidato->id, 'pin' => '7049',
            'accion' => 'ventas.anular', 'recurso' => $venta->ulid,
            'datos' => ['motivo' => 'Error'],
        ])->assertForbidden()->assertJsonPath('error_code', 'supervisor_invalido');
        $this->assertDatabaseCount('autorizaciones_supervisor', 0);
    }

    /** @param list<string> $permisos */
    private function prepararSupervisor(array $permisos): Usuario
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $this->prepararNegocio($permisos);
        $supervisor = Usuario::factory()->admin()->create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
        ]);
        $supervisor->forceFill(['pin_caja_hash' => Hash::make('7049')])->save();

        $this->actingAs($this->usuario);

        return $supervisor;
    }

    private function emitirPara(Usuario $supervisor, string $accion, ?string $recurso, array $datos): string
    {
        return $this->postJson('/api/v1/autorizaciones', [
            'supervisor_id' => $supervisor->id, 'pin' => '7049',
            'accion' => $accion, 'recurso' => $recurso, 'datos' => $datos,
        ])->assertCreated()->json('data.token');
    }
}
