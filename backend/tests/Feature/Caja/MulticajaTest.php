<?php

declare(strict_types=1);

namespace Tests\Feature\Caja;

use App\Aplicacion\Apartados\LiquidarApartado;
use App\Aplicacion\Apartados\RegistrarAbonoApartado;
use App\Aplicacion\Caja\AbrirCaja;
use App\Aplicacion\Caja\CerrarCaja;
use App\Aplicacion\Caja\ConsolidarCajas;
use App\Aplicacion\Cotizaciones\ConvertirCotizacion;
use App\Aplicacion\CuentasPagar\RegistrarPago;
use App\Aplicacion\GiftCards\RecargarGiftCard;
use App\Aplicacion\Ventas\AnularVenta;
use App\Modules\Apartados\Dtos\LiquidarApartadoDto;
use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Cotizaciones\Dtos\ConvertirCotizacionDto;
use App\Modules\CuentasPagar\Dtos\RegistrarPagoDto;
use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Exceptions\SupervisorRequeridoException;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Tpv\Dtos\AbrirCajaDto;
use App\Modules\Tpv\Dtos\AnularVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Exceptions\AnulacionRequiereDevolucionException;
use App\Modules\Tpv\Exceptions\CajaYaAbiertaException;
use App\Modules\Tpv\Exceptions\ConsolidacionCajaNoDisponibleException;
use App\Modules\Tpv\Http\Resources\CajaRemotaResource;
use App\Modules\Tpv\Http\Resources\CajaSaldoResource;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AutorizaOperaciones;
use Tests\Support\PreparaArq04d;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class MulticajaTest extends TestCase
{
    use AutorizaOperaciones;
    use PreparaArq04d;
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_cobro_y_abonos_entran_en_la_caja_de_la_terminal_operadora(): void
    {
        $this->prepararNegocio(['ventas.crear', 'apartados.abonar', 'cuentas_cobrar.registrar_abono']);
        $cuenta = $this->crearCuentaCobrar();
        $apartado = $this->crearApartado();
        $otra = CajaSesion::factory()->create(['sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id]);
        $this->actingAs($this->usuario);
        $this->seleccionarTerminalDeCaja();

        $importes = ['metodo_pago_id' => $this->metodoPago->id, 'monto' => 25];
        $venta = $this->postJson('/api/v1/ventas', $this->payloadVenta())->assertCreated()->json('data.id');
        $this->postJson("/api/v1/cuentas-cobrar/{$cuenta->ulid}/abonos", $importes)->assertOk();
        $this->postJson("/api/v1/apartados/{$apartado->ulid}/abonos", ['monto' => 25, 'pagos' => [$importes]])->assertOk();

        $this->assertDatabaseHas('ventas', ['ulid' => $venta, 'caja_sesion_id' => $this->caja->id]);
        $this->assertDatabaseHas('abonos_cuenta', ['cuenta_cobrar_id' => $cuenta->id, 'caja_sesion_id' => $this->caja->id]);
        $this->assertDatabaseHas('apartado_abonos', ['apartado_id' => $apartado->id, 'caja_sesion_id' => $this->caja->id]);
        foreach (['venta', 'abono_cxc', 'abono_apartado'] as $tipo) {
            $this->assertDatabaseMissing('caja_movimientos', ['caja_sesion_id' => $otra->id, 'tipo' => $tipo]);
        }
    }

    public function test_gasto_de_caja_se_imputa_a_la_terminal_que_lo_registra(): void
    {
        $this->prepararNegocio(['gastos.crear']);
        $otra = CajaSesion::factory()->create(['sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id]);
        $this->actingAs($this->usuario);
        $this->seleccionarTerminalDeCaja();

        $this->postJson('/api/v1/gastos', ['descripcion' => 'Papelería multicaja', 'monto' => 25])->assertCreated();
        $this->assertDatabaseHas('gastos', ['descripcion' => 'Papelería multicaja', 'caja_sesion_id' => $this->caja->id]);
        $this->assertDatabaseHas('caja_movimientos', ['caja_sesion_id' => $this->caja->id, 'tipo' => 'gasto', 'usuario_id' => $this->usuario->id]);
        $this->assertDatabaseMissing('caja_movimientos', ['caja_sesion_id' => $otra->id, 'tipo' => 'gasto']);
    }

    public function test_pago_a_proveedor_se_imputa_a_la_terminal_operadora(): void
    {
        $d = $this->negocio04d();
        CajaSesion::factory()->create(['sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id]);

        $pago = app(RegistrarPago::class)->ejecutar(new RegistrarPagoDto(25, $d['metodo']->id, null), $d['cxp']->id, $d['usuario'], $d['terminal']);

        $this->assertSame($d['caja']->id, $pago->caja_sesion_id);
    }

    public function test_recarga_se_imputa_a_la_terminal_operadora(): void
    {
        $d = $this->negocio04d();
        CajaSesion::factory()->create(['sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id]);

        app(RecargarGiftCard::class)->ejecutar(new RecargarGiftCardDto(25, [new PagoDto($d['metodo']->id, 25)]), $d['gift']->id, $d['usuario'], $d['terminal']);

        $this->assertDatabaseHas('gift_card_recargas', ['gift_card_id' => $d['gift']->id, 'caja_sesion_id' => $d['caja']->id]);
    }

    public function test_conversion_de_cotizacion_se_imputa_a_la_terminal_operadora(): void
    {
        $this->prepararNegocio([]);
        $id = $this->crearCotizacion();
        $terminal = Terminal::sinTenant()->findOrFail($this->caja->terminal_id);
        CajaSesion::factory()->create(['sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id]);

        $venta = app(ConvertirCotizacion::class)->ejecutar(new ConvertirCotizacionDto($this->metodoPago->id), $id, $this->usuario, $terminal);

        $this->assertSame($this->caja->id, $venta->caja_sesion_id);
    }

    public function test_liquidacion_de_apartado_usa_la_terminal_operadora(): void
    {
        $this->prepararNegocio([]);
        $apartado = $this->crearApartado();
        $terminal = Terminal::sinTenant()->findOrFail($this->caja->terminal_id);
        app(RegistrarAbonoApartado::class)->ejecutar(new RegistrarAbonoApartadoDto(100, [new PagoApartadoDto($this->metodoPago->id, 100)], null), $apartado, $this->usuario, $terminal);
        CajaSesion::factory()->create(['sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id]);

        $liquidado = app(LiquidarApartado::class)->ejecutar(new LiquidarApartadoDto, $apartado, $this->usuario, $terminal);

        $this->assertSame($this->caja->id, Venta::query()->findOrFail($liquidado->venta_id)->caja_sesion_id);
    }

    public function test_operador_de_caja_puede_listar_y_elegir_terminal_de_su_sucursal_sin_administrarlas(): void
    {
        $this->prepararNegocio(['caja.ver', 'caja.abrir']);
        $this->actingAs($this->usuario);
        $this->seleccionarTerminalDeCaja();
        $this->getJson('/api/v1/terminales')->assertForbidden();
        $this->getJson('/api/v1/sesion/terminales')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', (int) $this->caja->terminal_id);
        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $this->cajaB->terminal_id])->assertUnprocessable();
        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $this->caja->terminal_id])->assertNoContent();
    }

    public function test_api_usa_la_terminal_de_sesion_para_abrir_y_consultar_caja(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $usuario = Usuario::factory()->admin()->create();
        $usuario->forceFill(['two_factor_confirmed_at' => now()])->save();
        $primera = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $segunda = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);

        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->actingAs($usuario)->withHeader('Referer', 'http://localhost:4200/');
        $this->postJson('/api/v1/caja/abrir', ['monto_apertura' => 100])
            ->assertUnprocessable()->assertJsonPath('error_code', 'terminal_requerida');

        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $primera->id])->assertNoContent();
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());
        $this->postJson('/api/v1/caja/abrir', ['monto_apertura' => 100])->assertCreated();
        $this->getJson('/api/v1/caja/actual')->assertOk()->assertJsonPath('data.monto_apertura', '100.00');

        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $segunda->id])->assertNoContent();
        $this->getJson('/api/v1/caja/actual')->assertOk()->assertJsonPath('data', null);
        $this->postJson('/api/v1/caja/abrir', ['monto_apertura' => 200])->assertCreated();
        $this->getJson('/api/v1/caja/actual')->assertOk()->assertJsonPath('data.monto_apertura', '200.00');
    }

    public function test_no_se_puede_anular_despues_del_corte_incluso_si_hay_otra_caja_abierta(): void
    {
        $usuario = Usuario::factory()->create();
        $cerrada = CajaSesion::factory()->cerrada()->create([
            'sucursal_id' => $usuario->sucursal_id,
            'usuario_id' => $usuario->id,
        ]);
        $abierta = CajaSesion::factory()->create([
            'sucursal_id' => $usuario->sucursal_id,
            'usuario_id' => $usuario->id,
            'monto_apertura' => '20.00',
        ]);
        $venta = Venta::factory()->create([
            'tenant_id' => $usuario->tenant_id,
            'sucursal_id' => $usuario->sucursal_id,
            'caja_sesion_id' => $cerrada->id,
        ]);

        try {
            app(AnularVenta::class)->ejecutar(new AnularVentaDto('Prueba después del corte'), $venta, $usuario);
            $this->fail('Una venta después del corte requiere devolución.');
        } catch (AnulacionRequiereDevolucionException $error) {
            $this->assertSame('anulacion_requiere_devolucion', $error->errorCode());
        }

        $this->assertSame('completada', $venta->fresh()->getAttribute('estado'));
        $this->assertSame('20.00', $abierta->fresh()->getAttribute('saldo_teorico'));
    }

    public function test_recurso_remoto_omite_importes_en_cierre_ciego(): void
    {
        $usuario = Usuario::factory()->create();
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(100), $usuario, $terminal);
        $caja->load('terminal', 'saldos.metodoPago');
        $recurso = new CajaRemotaResource($caja);

        $ciego = $recurso->response()->getData(true);
        $this->assertSame(MetodoEfectivo::id(), $ciego['data']['metodos'][0]['metodo_pago_id']);
        $this->assertArrayNotHasKey('total_teorico', $ciego['data']['metodos'][0]);
        $this->assertArrayNotHasKey('diferencia', $ciego['data']['metodos'][0]);

    }

    public function test_recurso_del_corte_normal_publica_el_teorico_antes_del_corte(): void
    {
        $usuario = Usuario::factory()->create();
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(100), $usuario, $terminal);
        $caja->load('saldos.metodoPago');
        $saldo = new CajaSaldoResource($caja->saldos->sole());

        $this->assertSame('100.00', $saldo->response()->getData(true)['data']['total_teorico']);
    }

    public function test_cierre_remoto_exige_pin_del_supervisor_y_conteos_reales(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $usuario = Usuario::factory()->admin()->create();
        $usuario->forceFill(['two_factor_confirmed_at' => now(), 'pin_caja_hash' => Hash::make('7049')])->save();
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $otra = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(100), $usuario, $otra);

        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->actingAs($usuario)->withHeader('Referer', 'http://localhost:4200/');
        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $terminal->id])->assertNoContent();
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());

        app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(50), $usuario, $terminal);
        $otroUsuario = Usuario::factory()->create(['tenant_id' => $usuario->tenant_id]);
        $terminalAjena = Terminal::factory()->create(['sucursal_id' => $otroUsuario->sucursal_id]);
        app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(200), $otroUsuario, $terminalAjena);
        $this->getJson('/api/v1/caja/remotas')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $caja->ulid)
            ->assertJsonMissingPath('data.0.metodos.0.total_teorico')
            ->assertJsonMissingPath('data.0.metodos.0.diferencia');

        $datos = ['conteos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 100]]];
        $ruta = "/api/v1/caja/{$caja->ulid}/cerrar";
        $this->patchJson($ruta, $datos)->assertForbidden()->assertJsonPath('error_code', 'supervisor_requerido');
        $this->assertSame('abierta', $caja->fresh()->getAttribute('estado'));

        $token = $this->postJson('/api/v1/autorizaciones', [
            'supervisor_id' => $usuario->id, 'pin' => '7049', 'accion' => 'caja.cerrar_remota',
            'recurso' => $caja->ulid, 'datos' => $datos,
        ])->assertCreated()->json('data.token');
        $this->patchJson($ruta, $datos, ['X-Autorizacion-Supervisor' => $token])
            ->assertOk()->assertJsonPath('data.estado', 'cerrada');
        $this->assertDatabaseHas('auditoria', ['tabla_afectada' => 'caja_sesiones', 'registro_id' => $caja->id]);
    }

    public function test_supervisor_puede_listar_y_cerrar_cajas_sin_elegir_terminal(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $usuario = Usuario::factory()->admin()->create();
        $usuario->forceFill(['two_factor_confirmed_at' => now(), 'pin_caja_hash' => Hash::make('7049')])->save();
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(100), $usuario, $terminal);

        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->actingAs($usuario)->withHeader('Referer', 'http://localhost:4200/');
        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.terminal', null);
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());
        $this->getJson('/api/v1/caja/remotas')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $caja->ulid);

        $datos = ['conteos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 100]]];
        $ruta = "/api/v1/caja/{$caja->ulid}/cerrar";
        $this->patchJson($ruta, $datos)->assertForbidden()->assertJsonPath('error_code', 'supervisor_requerido');

        $token = $this->postJson('/api/v1/autorizaciones', [
            'supervisor_id' => $usuario->id, 'pin' => '7049', 'accion' => 'caja.cerrar_remota',
            'recurso' => $caja->ulid, 'datos' => $datos,
        ])->assertCreated()->json('data.token');
        $this->patchJson($ruta, $datos, ['X-Autorizacion-Supervisor' => $token])
            ->assertOk()->assertJsonPath('data.estado', 'cerrada');
    }

    public function test_fecha_operativa_es_el_dia_local_de_apertura_aunque_el_corte_cruce_medianoche(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-27T01:00:00Z'));
        $usuario = Usuario::factory()->create();
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(100), $usuario, $terminal);

        $this->travelTo(CarbonImmutable::parse('2026-11-27T07:00:00Z'));
        $corte = app(CerrarCaja::class)->ejecutar($caja, [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 100]]);

        $this->assertSame('2026-11-26', $corte['sesion']->getAttribute('fecha_operativa'));
    }

    public function test_consolidado_complementario_conserva_el_original_y_suma_el_total_del_dia(): void
    {
        $usuario = Usuario::factory()->create();
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $fecha = '2026-11-26';
        $this->travelTo(CarbonImmutable::parse('2026-11-26T18:00:00Z'));

        $abrir = app(AbrirCaja::class);
        $cerrar = app(CerrarCaja::class);
        $consolidar = app(ConsolidarCajas::class);
        $caja = $abrir->ejecutar(new AbrirCajaDto(100), $usuario, $terminal);
        try {
            $consolidar->ejecutar($usuario, $fecha);
            $this->fail('Una caja abierta impide el cierre consolidado.');
        } catch (ConsolidacionCajaNoDisponibleException $error) {
            $this->assertSame('caja_consolidacion_no_disponible', $error->errorCode());
        }
        $cerrar->ejecutar($caja, [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 100]]);
        $original = $consolidar->ejecutar($usuario, $fecha)->sole();
        $fotoOriginal = $original->fresh()->getAttributes();

        try {
            $abrir->ejecutar(new AbrirCajaDto(50), $usuario, $terminal);
            $this->fail('Una apertura tardía requiere supervisor.');
        } catch (SupervisorRequeridoException $error) {
            $this->assertSame('supervisor_requerido', $error->errorCode());
        }
        $autorizacion = self::conSupervisor($usuario, AccionSupervisor::AbrirCajaTardia, ['monto_apertura' => 50], $original->ulid);
        $tardia = $abrir->ejecutar(new AbrirCajaDto(50), $usuario, $terminal, $autorizacion);
        $cerrar->ejecutar($tardia, [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 50]]);

        $complementario = $consolidar->ejecutar($usuario, $fecha)->sole();
        $this->assertSame($original->id, $complementario->getAttribute('original_id'));
        $this->assertSame($usuario->id, $complementario->getAttribute('supervisor_apertura_id'));
        $this->assertSame($fotoOriginal, $original->fresh()->getAttributes());
        $this->assertSame('150.00', $consolidar->consultar($usuario, $fecha)['total_contado']);
        $this->assertSame($original->id, $caja->fresh()->getAttribute('caja_consolidado_id'));
        $this->assertSame($complementario->id, $tardia->fresh()->getAttribute('caja_consolidado_id'));

        $this->expectException(ConsolidacionCajaNoDisponibleException::class);
        $consolidar->ejecutar($usuario, $fecha);
    }

    public function test_audita_la_creacion_del_original_y_del_complementario(): void
    {
        $usuario = Usuario::factory()->create();
        $this->actingAs($usuario);
        app(TenantContext::class)->set($usuario->tenant);
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $this->travelTo(CarbonImmutable::parse('2026-11-26T18:00:00Z'));
        $abrir = app(AbrirCaja::class);
        $cerrar = app(CerrarCaja::class);
        $consolidar = app(ConsolidarCajas::class);
        $conteos = [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 50]];

        $cerrar->ejecutar($abrir->ejecutar(new AbrirCajaDto(50), $usuario, $terminal), $conteos);
        $original = $consolidar->ejecutar($usuario, '2026-11-26')->sole();
        $autorizacion = self::conSupervisor($usuario, AccionSupervisor::AbrirCajaTardia, ['monto_apertura' => 50], $original->ulid);
        $cerrar->ejecutar($abrir->ejecutar(new AbrirCajaDto(50), $usuario, $terminal, $autorizacion), $conteos);
        $complementario = $consolidar->ejecutar($usuario, '2026-11-26')->sole();

        foreach ([$original, $complementario] as $documento) {
            $this->assertDatabaseHas('auditoria', [
                'tabla_afectada' => 'caja_consolidados',
                'registro_id' => $documento->id,
                'accion' => 'create',
                'tenant_id' => $usuario->tenant_id,
                'usuario_id' => $usuario->id,
            ]);
        }
    }

    public function test_api_consolida_y_consulta_el_total_y_los_cortes_de_la_fecha(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $usuario = Usuario::factory()->admin()->create();
        $usuario->forceFill(['two_factor_confirmed_at' => now()])->save();
        $terminal = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $this->travelTo(CarbonImmutable::parse('2026-11-26T18:00:00Z'));
        $caja = app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(100), $usuario, $terminal);
        app(CerrarCaja::class)->ejecutar($caja, [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 101]]);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/caja/consolidado', ['fecha_operativa' => '2026-11-26'])
            ->assertCreated()->assertJsonPath('data.total_contado', '101.00');

        $this->getJson('/api/v1/caja/consolidado?fecha_operativa=2026-11-26')
            ->assertOk()
            ->assertJsonPath('data.documentos.0.cortes.0.terminal', $terminal->nombre)
            ->assertJsonPath('data.documentos.0.total_contado', '101.00')
            ->assertJsonPath('data.diferencia', '1.00');
    }

    public function test_caja_sesiones_exige_terminal_desde_su_creacion(): void
    {
        $columnas = collect(Schema::getColumns('caja_sesiones'))->keyBy('name');

        $this->assertTrue($columnas->has('terminal_id'));
        $this->assertFalse($columnas->get('terminal_id')['nullable']);
    }

    public function test_dos_terminales_de_una_sucursal_pueden_abrir_una_caja_cada_una(): void
    {
        $usuario = Usuario::factory()->create();
        $primera = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);
        $segunda = Terminal::factory()->create(['sucursal_id' => $usuario->sucursal_id]);

        $abrir = app(AbrirCaja::class);
        $cajaPrimera = $abrir->ejecutar(new AbrirCajaDto(100), $usuario, $primera);
        $cajaSegunda = $abrir->ejecutar(new AbrirCajaDto(200), $usuario, $segunda);

        $this->assertNotSame($cajaPrimera->id, $cajaSegunda->id);
        $this->assertSame($primera->id, $cajaPrimera->getAttribute('terminal_id'));
        $this->assertSame($segunda->id, $cajaSegunda->getAttribute('terminal_id'));

        $this->expectException(CajaYaAbiertaException::class);
        $abrir->ejecutar(new AbrirCajaDto(0), $usuario, $primera);
    }
}
