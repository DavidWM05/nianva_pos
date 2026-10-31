<?php

namespace Tests\Feature\GiftCards;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class GiftCardExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['gift_cards.emitir']);
    }

    public function test_emision_rechaza_cliente_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/gift-cards', [
            'cliente_id' => $this->clienteB->id,
            'monto' => 100,
        ])->assertStatus(422)->assertJsonValidationErrors(['cliente_id']);
    }
}
