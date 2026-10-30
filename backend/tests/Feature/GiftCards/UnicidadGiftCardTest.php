<?php

namespace Tests\Feature\GiftCards;

use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class UnicidadGiftCardTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([]);
    }

    private function crear(int $tenantId, string $codigo): GiftCard
    {
        return GiftCard::create([
            'tenant_id' => $tenantId,
            'codigo' => $codigo,
            'saldo_inicial' => 100,
            'saldo_actual' => 100,
            'estado' => 'activa',
        ]);
    }

    public function test_dos_tenants_pueden_usar_el_mismo_codigo(): void
    {
        app(TenantContext::class)->set($this->tenant);
        $giftA = $this->crear($this->tenant->id, 'GC-DUP-001');

        app(TenantContext::class)->set($this->tenantB);
        $giftB = $this->crear($this->tenantB->id, 'GC-DUP-001');

        app(TenantContext::class)->set($this->tenant);
        $encontradaA = GiftCard::where('codigo', 'GC-DUP-001')->firstOrFail();

        app(TenantContext::class)->set($this->tenantB);
        $encontradaB = GiftCard::where('codigo', 'GC-DUP-001')->firstOrFail();

        $this->assertSame($giftA->id, $encontradaA->id);
        $this->assertSame($giftB->id, $encontradaB->id);

        app(TenantContext::class)->set($this->tenant);

        $this->expectException(QueryException::class);
        $this->crear($this->tenant->id, 'GC-DUP-001');
    }
}
