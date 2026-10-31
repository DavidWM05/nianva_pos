<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\DispositivoConfiable;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<DispositivoConfiable> */
class DispositivoConfiableFactory extends Factory
{
    protected $model = DispositivoConfiable::class;

    public function definition(): array
    {
        return [
            'usuario_id' => Usuario::factory(),
            'identificador_dispositivo' => Str::random(64),
            'user_agent' => fake()->userAgent(),
            'ip_registro' => fake()->ipv4(),
            'fecha_creacion' => now(),
            'fecha_expiracion' => now()->addDays(30),
        ];
    }
}
