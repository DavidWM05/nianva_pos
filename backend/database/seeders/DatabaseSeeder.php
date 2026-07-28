<?php

namespace Database\Seeders;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Database\Seeders\MetodosPagoSeeder;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\UnidadesMedida\Database\Seeders\UnidadesMedidaSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(NucleoRolesPermisosSeeder::class);
        $this->call(MetodosPagoSeeder::class);
        $this->call(UnidadesMedidaSeeder::class);

        $this->poblarModulosActivos();
    }

    /**
     * Garantiza que todos los tenants tengan configuracion_tenant con una
     * lista de modulos activos por defecto. Si la fila no existe, se crea;
     * si existe pero modulos_activos es NULL, se actualiza con los defaults.
     */
    private function poblarModulosActivos(): void
    {
        $defaults = ModuloActivo::MODULOS_DEFAULT;

        foreach (Tenant::all() as $tenant) {
            $config = ConfiguracionTenant::firstOrCreate(
                ['tenant_id' => $tenant->id],
            );

            if ($config->modulos_activos === null) {
                $config->update(['modulos_activos' => $defaults]);
            }
        }
    }
}
