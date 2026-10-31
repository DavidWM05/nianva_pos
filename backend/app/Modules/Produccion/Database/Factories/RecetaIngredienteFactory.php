<?php

namespace App\Modules\Produccion\Database\Factories;

use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\RecetaIngrediente;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RecetaIngrediente>
 */
class RecetaIngredienteFactory extends Factory
{
    protected $model = RecetaIngrediente::class;

    public function definition(): array
    {
        return [
            'receta_id' => fn () => Receta::factory()->create()->id,
            'insumo_id' => fn (array $a) => Insumo::factory()->create([
                'tenant_id' => Receta::query()->withoutGlobalScopes()
                    ->whereKey($a['receta_id'])
                    ->firstOrFail()
                    ->getAttribute('tenant_id'),
            ])->id,
            'cantidad' => 1,
            'unidad_medida_id' => fn (array $a) => Insumo::query()->withoutGlobalScopes()
                ->whereKey($a['insumo_id'])
                ->firstOrFail()
                ->getAttribute('unidad_medida_id'),
        ];
    }
}
