<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\VarianteAtributoValor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El valor y el atributo se resuelven a partir de la variante (mismo tenant) y del valor dado.
 *
 * @extends Factory<VarianteAtributoValor>
 */
class VarianteAtributoValorFactory extends Factory
{
    protected $model = VarianteAtributoValor::class;

    public function definition(): array
    {
        return [
            'variante_id' => fn () => ProductoVariante::factory()->create()->id,
            'atributo_valor_id' => fn (array $a) => AtributoValor::factory()->create([
                'atributo_id' => Atributo::factory()->create([
                    'tenant_id' => ProductoVariante::sinTenant()->whereKey($a['variante_id'])->firstOrFail()->getAttribute('tenant_id'),
                ])->id,
            ])->id,
            'atributo_id' => fn (array $a) => AtributoValor::sinTenant()->whereKey($a['atributo_valor_id'])->firstOrFail()->atributo_id,
        ];
    }
}
