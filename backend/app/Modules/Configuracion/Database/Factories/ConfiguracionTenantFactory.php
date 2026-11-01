<?php

namespace App\Modules\Configuracion\Database\Factories;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/** @extends Factory<ConfiguracionTenant> */
class ConfiguracionTenantFactory extends Factory
{
    protected $model = ConfiguracionTenant::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'moneda' => '$',
            'zona_horaria' => 'America/Mexico_City',
            'mensaje_ticket' => null,
            'logo_url' => null,
            'mostrar_rfc' => true,
            'mostrar_telefono' => true,
            'mostrar_correo' => true,
            'backup_auto' => false,
            'backup_frecuencia' => 'semanal',
            'backup_ultimo' => null,
            'codigo_barras_automatico' => false,
            'modulos_activos' => null,
        ];
    }

    public function create($attributes = [], ?Model $parent = null)
    {
        $cantidad = max(1, $this->count ?? 1);
        /** @var Collection<int, ConfiguracionTenant> $resultados */
        $resultados = new Collection;

        for ($i = 0; $i < $cantidad; $i++) {
            $factory = $attributes === [] ? $this : $this->state($attributes);
            $datos = $factory->getExpandedAttributes($parent);

            $configuracion = ConfiguracionTenant::where('tenant_id', $datos['tenant_id'])->first() ?? new ConfiguracionTenant;
            $configuracion->fill($datos)->save();
            $resultados->push($configuracion);
        }

        if ($cantidad === 1) {
            return $resultados->first() ?? throw new \RuntimeException('No se pudo crear la configuracion.');
        }

        return $resultados;
    }
}
