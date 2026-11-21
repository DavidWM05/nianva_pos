<?php

declare(strict_types=1);

namespace Tests\Feature\GiftCards;

use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Una gift card puede emitirse sin cliente (`cliente_id` nullable). El detalle y el listado la
 * devuelven con `cliente: null`; antes el Resource leia `$this->cliente->id` sobre null.
 */
class GiftCardSinClienteTest extends TestCase
{
    use RefreshDatabase;

    private function actuar(Tenant $tenant): void
    {
        app(TenantContext::class)->set($tenant);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => 'gift_cards.ver'], ['modulo' => 'gift_cards', 'accion' => 'ver'])->id);
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);
    }

    public function test_el_detalle_de_una_gift_card_sin_cliente_trae_cliente_null(): void
    {
        $tenant = Tenant::factory()->create();
        $giftCard = GiftCard::factory()->create(['tenant_id' => $tenant->id, 'cliente_id' => null]);

        $this->actuar($tenant);
        $this->getJson("/api/v1/gift-cards/{$giftCard->ulid}")
            ->assertOk()
            ->assertJsonPath('data.cliente', null);
    }

    public function test_el_listado_trae_cliente_null_en_una_gift_card_sin_cliente(): void
    {
        $tenant = Tenant::factory()->create();
        GiftCard::factory()->create(['tenant_id' => $tenant->id, 'cliente_id' => null]);

        $this->actuar($tenant);
        $this->getJson('/api/v1/gift-cards')
            ->assertOk()
            ->assertJsonPath('data.0.cliente', null);
    }
}
