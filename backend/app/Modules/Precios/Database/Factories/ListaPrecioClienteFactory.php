<?php

declare(strict_types=1);

namespace App\Modules\Precios\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Support\TenantParaFactory;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioCliente;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ListaPrecioCliente> */
class ListaPrecioClienteFactory extends Factory
{
    protected $model = ListaPrecioCliente::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'lista_precio_id' => fn (array $a) => ListaPrecio::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'cliente_id' => fn (array $a) => Cliente::factory()->create(['tenant_id' => $a['tenant_id']])->id,
        ];
    }
}
