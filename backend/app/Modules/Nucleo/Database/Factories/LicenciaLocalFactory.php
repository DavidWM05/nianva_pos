<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LicenciaLocal> */
class LicenciaLocalFactory extends Factory
{
    protected $model = LicenciaLocal::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'tipo' => 'saas',
            'plan_id' => null,
            'fecha_inicio' => now()->toDateString(),
            'fecha_expiracion' => now()->addYear()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => null,
            'ultima_validacion' => now(),
        ];
    }
}
