<?php

namespace App\Modules\Nucleo\Database\Factories;

use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/** @extends Factory<ConfiguracionSeguridad> */
class ConfiguracionSeguridadFactory extends Factory
{
    protected $model = ConfiguracionSeguridad::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'dias_dispositivo_normal' => 30,
            'dias_dispositivo_admin' => 14,
        ];
    }

    public function create($attributes = [], ?Model $parent = null)
    {
        $cantidad = max(1, $this->count ?? 1);
        /** @var Collection<int, ConfiguracionSeguridad> $resultados */
        $resultados = new Collection;

        for ($i = 0; $i < $cantidad; $i++) {
            $factory = $attributes === [] ? $this : $this->state($attributes);
            $datos = $factory->getExpandedAttributes($parent);

            $configuracion = ConfiguracionSeguridad::where('tenant_id', $datos['tenant_id'])->first() ?? new ConfiguracionSeguridad;
            $configuracion->fill($datos)->save();
            $resultados->push($configuracion);
        }

        if ($cantidad === 1) {
            return $resultados->first() ?? throw new \RuntimeException('No se pudo crear la configuracion.');
        }

        return $resultados;
    }
}
