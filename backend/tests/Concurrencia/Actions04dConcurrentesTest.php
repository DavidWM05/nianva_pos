<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\PreparaArq04d;
use Tests\TestCase;

#[Group('concurrencia')]
class Actions04dConcurrentesTest extends TestCase
{
    use PreparaArq04d;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertSame('mysql', DB::connection()->getDriverName(), 'Concurrencia requiere MySQL real.');
    }

    public function test_abonos_cxc_conservan_los_dos_movimientos_y_el_saldo(): void
    {
        $d = $this->negocio04d();
        $this->competir($d, 'cuentas_cobrar', $d['cxc']->id, 'cxc_abonar', ['cxc_abonar', 'cxc_abonar']);
        $this->assertSame(50.0, (float) $d['cxc']->fresh()->saldo_pendiente);
        $this->assertSame(2, AbonoCuenta::where('cuenta_cobrar_id', $d['cxc']->id)->count());
        $this->assertSame(50.0, (float) AbonoCuenta::where('cuenta_cobrar_id', $d['cxc']->id)->sum('monto'));
    }

    public function test_l04_dos_abonos_con_el_mismo_saldo_inicial_no_sobregiran_la_cuenta(): void
    {
        $d = $this->negocio04d();
        $this->competir($d, 'cuentas_cobrar', $d['cxc']->id, 'l04', ['l04', 'abono_excede_saldo']);
        $saldo = (float) $d['cxc']->fresh()->saldo_pendiente;
        $abonado = (float) AbonoCuenta::where('cuenta_cobrar_id', $d['cxc']->id)->sum('monto');
        $this->assertSame(25.0, $saldo);
        $this->assertGreaterThanOrEqual(0, $saldo);
        $this->assertSame(100.0, $saldo + $abonado);
        $this->assertSame(1, AbonoCuenta::where('cuenta_cobrar_id', $d['cxc']->id)->count());
    }

    public function test_pagos_cxp_rechazan_el_segundo_pago_que_excede_el_saldo(): void
    {
        $d = $this->negocio04d();
        $this->competir($d, 'cuentas_pagar', $d['cxp']->id, 'cxp_pagar', ['cxp_pagar', 'pago_excede_saldo']);
        $this->assertSame(25.0, (float) $d['cxp']->fresh()->saldo_pendiente);
        $this->assertSame(1, AbonoPagar::where('cuenta_pagar_id', $d['cxp']->id)->count());
        $this->assertSame(75.0, (float) AbonoPagar::where('cuenta_pagar_id', $d['cxp']->id)->sum('monto'));
    }

    public function test_cargos_gift_card_no_permiten_saldo_negativo(): void
    {
        $d = $this->negocio04d();
        $this->competir($d, 'gift_cards', $d['gift']->id, 'gift_cargar', ['gift_cargar', 'gift_card_saldo_insuficiente']);
        $this->assertSame(25.0, (float) $d['gift']->fresh()->saldo_actual);
        $this->assertSame('activa', $d['gift']->fresh()->estado);
    }

    public function test_recargas_gift_card_conservan_ambos_abonos(): void
    {
        $d = $this->negocio04d();
        $this->competir($d, 'gift_cards', $d['gift']->id, 'gift_recargar', ['gift_recargar', 'gift_recargar']);
        $this->assertSame(160.0, (float) $d['gift']->fresh()->saldo_actual);
        $this->assertSame(2, GiftCardRecarga::where('gift_card_id', $d['gift']->id)->count());
        $this->assertSame(60.0, (float) GiftCardRecarga::where('gift_card_id', $d['gift']->id)->sum('monto'));
    }

    public function test_aplicaciones_nota_credito_no_reutilizan_el_saldo(): void
    {
        $d = $this->negocio04d();
        $this->competir($d, 'notas_credito', $d['nota']->id, 'nota_aplicar', ['nota_aplicar', 'nota_credito_saldo_insuficiente']);
        $this->assertSame(25.0, (float) $d['nota']->fresh()->saldo_disponible);
        $this->assertSame(1, NotaCreditoUso::where('nota_credito_id', $d['nota']->id)->count());
        $this->assertSame(75.0, (float) NotaCreditoUso::where('nota_credito_id', $d['nota']->id)->sum('monto_usado'));
    }

    public function test_pago_cuota_solo_se_aplica_una_vez(): void
    {
        $d = $this->negocio04d();
        $this->competir($d, 'planes_pago_cliente_cuotas', $d['cuota']->id, 'cuota_pagar', ['cuota_pagar', 'cuota_ya_pagada']);
        $this->assertSame('pagada', $d['cuota']->fresh()->estado);
        $this->assertNotNull($d['cuota']->fresh()->fecha_pago_real);
    }

    private function competir(array $d, string $tabla, int $id, string $op, array $esperados): void
    {
        $hijos = [];
        config(['database.connections.bloqueador04d' => config('database.connections.'.DB::getDefaultConnection())]);
        $bloqueador = DB::connection('bloqueador04d');
        try {
            $bloqueador->beginTransaction();
            $bloqueador->table($tabla)->where('id', $id)->lockForUpdate()->first();
            $datos = ['tenant' => $d['tenant']->id, 'sucursal' => $d['sucursal']->id, 'usuario' => $d['usuario']->id, 'cliente' => $d['cliente']->id, 'metodo' => $d['metodo']->id, 'variante' => $d['variante']->id];
            foreach (['venta', 'cxc', 'cxp', 'gift', 'nota', 'plan', 'cuota'] as $modelo) {
                if (isset($d[$modelo])) {
                    $datos[$modelo] = $d[$modelo]->id;
                }
            }
            $actores = [$datos, $datos];
            if (in_array($op, ['cxc_abonar', 'l04', 'cxp_pagar', 'gift_recargar'], true)) {
                // Dos sucursales pueden operar la misma deuda/tarjeta; sus cajas no deben ocultar la carrera.
                $sucursal = Sucursal::factory()->create(['tenant_id' => $d['tenant']->id]);
                $usuario = Usuario::factory()->create(['tenant_id' => $d['tenant']->id, 'sucursal_id' => $sucursal->id]);
                CajaSesion::factory()->create(['sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id, 'estado' => 'abierta']);
                $actores[1]['sucursal'] = $sucursal->id;
                $actores[1]['usuario'] = $usuario->id;
            }
            foreach ($actores as $actor) {
                $hijos[] = ProcesosConcurrentes::iniciar($op, $actor);
            }
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::esperarBloqueo($hijo);
            }
            $bloqueador->commit();
            $resultados = [];
            foreach ($hijos as $hijo) {
                $hijo->wait();
                $this->assertSame(0, $hijo->getExitCode(), $hijo->getErrorOutput());
                $eventos = ProcesosConcurrentes::eventos($hijo);
                if ($op === 'l04') {
                    $iniciales = array_values(array_filter($eventos, static fn (array $e): bool => isset($e['saldo_inicial'])));
                    $this->assertCount(1, $iniciales);
                    $this->assertSame(100, $iniciales[0]['saldo_inicial']);
                }
                $lecturas = array_values(array_filter($eventos, static fn (array $e): bool => ($e['bloqueo'] ?? null) === $tabla));
                $this->assertNotEmpty($lecturas);
                $this->assertTrue($lecturas[0]['for_update'], 'La Action debe leer '.$tabla.' con SELECT FOR UPDATE.');
                $this->assertGreaterThan(0, $lecturas[0]['transaccion']);
                $resultados[] = $eventos[array_key_last($eventos)]['resultado'];
            }
            sort($resultados);
            sort($esperados);
            $this->assertSame($esperados, $resultados);
        } finally {
            foreach ($hijos as $hijo) {
                ProcesosConcurrentes::cerrar($hijo);
            }
            if ($bloqueador->transactionLevel() > 0) {
                $bloqueador->rollBack();
            }
            DB::purge('bloqueador04d');
            app(TenantContext::class)->set($d['tenant']);
        }
    }
}
