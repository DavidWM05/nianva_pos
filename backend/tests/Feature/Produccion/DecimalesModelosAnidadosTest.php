<?php

declare(strict_types=1);

namespace Tests\Feature\Produccion;

use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\RecetaIngrediente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DecimalesModelosAnidadosTest extends TestCase
{
    use RefreshDatabase;

    public static function modelos(): array
    {
        return [[InsumoStock::class], [RecetaIngrediente::class]];
    }

    #[DataProvider('modelos')]
    public function test_el_modelo_anidado_serializa_cantidad_con_tres_decimales(string $clase): void
    {
        $modelo = $clase::factory()->make(['cantidad' => '0.500']);
        $this->assertSame('0.500', $modelo->toArray()['cantidad']);
    }
}
