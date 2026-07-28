<?php

namespace Tests\Feature\GiftCards;

use App\Modules\GiftCards\Exceptions\GiftCardCanceladaException;
use App\Modules\GiftCards\Exceptions\GiftCardExpiradaException;
use App\Modules\GiftCards\Exceptions\GiftCardSaldoInsuficienteException;
use App\Modules\GiftCards\Exceptions\GiftCardYaCanceladaException;
use App\Modules\GiftCards\Exceptions\MontoInvalidoException;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Services\GiftCardService;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GiftCardServiceTest extends TestCase
{
    use RefreshDatabase;

    private GiftCardService $service;
    private Tenant $tenant;
    private Usuario $usuario;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(GiftCardService::class);

        $this->tenant = Tenant::create(['nombre' => 'Test GC', 'pais' => 'MX']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => null,
            'nombre' => 'Admin', 'correo' => 'admin-gc@test.com', 'password' => 'secret123',
        ]);
        app(TenantContext::class)->set($this->tenant);
    }

    public function test_emitir_crea_gift_card_con_codigo_unico(): void
    {
        $gc = $this->service->emitir([
            'tenant_id' => $this->tenant->id,
            'monto' => 500,
        ]);

        $this->assertStringStartsWith('GC-', $gc->codigo);
        $this->assertSame(500.0, (float) $gc->saldo_inicial);
        $this->assertSame(500.0, (float) $gc->saldo_actual);
        $this->assertSame('activa', $gc->estado);
    }

    public function test_emitir_con_monto_cero_lanza_excepcion(): void
    {
        $this->expectException(MontoInvalidoException::class);
        $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 0]);
    }

    public function test_recargar_incrementa_saldo(): void
    {
        $gc = $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 200]);

        $recargada = $this->service->recargar($gc->id, 150, $this->usuario->id);

        $this->assertSame(350.0, (float) $recargada->saldo_actual);
        $this->assertSame('activa', $recargada->estado);
    }

    public function test_recargar_gc_expirada_lanza_excepcion(): void
    {
        $gc = $this->service->emitir([
            'tenant_id' => $this->tenant->id,
            'monto' => 200,
            'fecha_expiracion' => now()->subDay()->toDateString(),
        ]);

        $this->expectException(GiftCardExpiradaException::class);
        $this->service->recargar($gc->id, 50, $this->usuario->id);
    }

    public function test_recargar_gc_cancelada_lanza_excepcion(): void
    {
        $gc = $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 200]);
        $this->service->cancelar($gc->id);

        $this->expectException(GiftCardCanceladaException::class);
        $this->service->recargar($gc->id, 50, $this->usuario->id);
    }

    public function test_descontar_saldo_actualiza_estado_a_usada(): void
    {
        $gc = $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 100]);

        $this->service->descontarSaldo($gc->id, 100);

        $gc->refresh();
        $this->assertSame(0.0, (float) $gc->saldo_actual);
        $this->assertSame('usada', $gc->estado);
    }

    public function test_descontar_mas_que_saldo_lanza_excepcion(): void
    {
        $gc = $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 100]);

        $this->expectException(GiftCardSaldoInsuficienteException::class);
        $this->service->descontarSaldo($gc->id, 200);
    }

    public function test_validar_para_pago_ok(): void
    {
        $gc = $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 100]);

        $validada = $this->service->validarParaPago($gc->codigo);

        $this->assertSame($gc->id, $validada->id);
    }

    public function test_validar_para_pago_expirada_lanza_excepcion(): void
    {
        $gc = $this->service->emitir([
            'tenant_id' => $this->tenant->id,
            'monto' => 100,
            'fecha_expiracion' => now()->subDay()->toDateString(),
        ]);

        $this->expectException(GiftCardExpiradaException::class);
        $this->service->validarParaPago($gc->codigo);
    }

    public function test_validar_para_pago_cancelada_lanza_excepcion(): void
    {
        $gc = $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 100]);
        $this->service->cancelar($gc->id);

        $this->expectException(GiftCardCanceladaException::class);
        $this->service->validarParaPago($gc->codigo);
    }

    public function test_cancelar_gc_ya_cancelada_lanza_excepcion(): void
    {
        $gc = $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 100]);
        $this->service->cancelar($gc->id);

        $this->expectException(GiftCardYaCanceladaException::class);
        $this->service->cancelar($gc->id);
    }

    public function test_aislamiento_tenant(): void
    {
        $this->service->emitir(['tenant_id' => $this->tenant->id, 'monto' => 100]);

        $tenant2 = Tenant::create(['nombre' => 'Otro', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, GiftCard::all()->count());
    }
}
