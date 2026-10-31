<?php

namespace App\Modules\Auditoria\Database\Factories;

use App\Modules\Auditoria\Models\LogSistema;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LogSistema> */
class LogSistemaFactory extends Factory
{
    protected $model = LogSistema::class;

    public function definition(): array
    {
        return [
            'tenant_id' => null,
            'producto_origen' => 'nucleo',
            'modulo_origen' => 'test',
            'nivel' => fake()->randomElement(['info', 'warning', 'error', 'critical']),
            'mensaje' => fake()->sentence(),
            'stack_trace' => null,
            'contexto' => [],
            'usuario_id' => null,
            'resuelto' => false,
        ];
    }
}
