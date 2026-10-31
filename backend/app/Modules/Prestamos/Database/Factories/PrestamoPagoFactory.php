<?php

namespace App\Modules\Prestamos\Database\Factories;

use App\Modules\Prestamos\Models\Prestamo;
use App\Modules\Prestamos\Models\PrestamoPago;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PrestamoPago>
 */
class PrestamoPagoFactory extends Factory
{
    protected $model = PrestamoPago::class;

    public function definition(): array
    {
        return [
            'prestamo_id' => fn () => Prestamo::factory()->create()->id,
            'caja_sesion_id' => null,
            'monto' => 100,
            'notas' => null,
        ];
    }
}
