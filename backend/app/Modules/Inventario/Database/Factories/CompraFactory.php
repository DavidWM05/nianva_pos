<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Compra> */
class CompraFactory extends Factory
{
    protected $model = Compra::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'proveedor_id' => fn (array $a) => Proveedor::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'numero_comprobante' => null,
            'comprobante_url' => null,
            'total' => 0,
        ];
    }
}
