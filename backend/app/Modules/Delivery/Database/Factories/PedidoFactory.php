<?php

namespace App\Modules\Delivery\Database\Factories;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\TenantParaFactory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * El costo de delivery y los items no se suman al pedido; usa PedidoService.
 *
 * @extends Factory<Pedido>
 */
class PedidoFactory extends Factory
{
    protected $model = Pedido::class;

    public function definition(): array
    {
        return [
            'tenant_id' => fn () => TenantParaFactory::id(),
            'sucursal_id' => fn (array $a) => Sucursal::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'venta_id' => null,
            'cliente_id' => fn (array $a) => Cliente::factory()->create(['tenant_id' => $a['tenant_id']])->id,
            'usuario_id' => fn (array $a) => Usuario::factory()->create([
                'tenant_id' => $a['tenant_id'],
                'sucursal_id' => $a['sucursal_id'],
            ])->id,
            'repartidor_id' => null,
            'numero_pedido' => fake()->unique()->bothify('PED-######'),
            'direccion_entrega' => fake()->address(),
            'referencia' => null,
            'costo_delivery' => 0,
            'estado' => 'pendiente',
            'tiempo_estimado' => 30,
            'notas' => null,
            'fecha_entrega' => null,
        ];
    }

    public function preparando(): static
    {
        return $this->state(fn () => ['estado' => 'preparando']);
    }

    public function enCamino(): static
    {
        return $this->state(fn () => ['estado' => 'en_camino']);
    }

    public function entregado(): static
    {
        return $this->state(fn () => [
            'estado' => 'entregado',
            'fecha_entrega' => now(),
        ]);
    }

    public function cancelado(): static
    {
        return $this->state(fn () => ['estado' => 'cancelado']);
    }
}
