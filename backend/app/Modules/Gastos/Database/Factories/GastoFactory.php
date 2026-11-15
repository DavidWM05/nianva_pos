<?php

namespace App\Modules\Gastos\Database\Factories;

use App\Modules\Gastos\Models\Gasto;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use Closure;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * El gasto queda en la sucursal de su caja (PRO-08). Respeta lo que pasa el test:
 * - con `caja_sesion_id`, sucursal y usuario salen de esa caja;
 * - con `sucursal_id` (y/o `usuario_id`), la caja es la abierta de esa sucursal o se abre
 *   una ahi (CajaService::abrirCajaConSucursal: una abierta por sucursal);
 * - sin nada, crea sucursal, usuario y caja coherentes y del mismo tenant.
 *
 * Cada closure recibe la definicion completa: un atributo que aun es Closure es uno que el
 * test no paso y que la factory resuelve mas abajo.
 *
 * @extends Factory<Gasto>
 */
class GastoFactory extends Factory
{
    protected $model = Gasto::class;

    public function definition(): array
    {
        return [
            'sucursal_id' => fn (array $a) => self::cajaDada($a)?->getAttribute('sucursal_id')
                ?? Sucursal::factory()->create()->id,
            'usuario_id' => fn (array $a) => self::cajaDada($a)?->getAttribute('usuario_id')
                ?? self::cajaAbierta($a['sucursal_id'])?->getAttribute('usuario_id')
                ?? Usuario::factory()->create([
                    'tenant_id' => Sucursal::query()->withoutGlobalScopes()->whereKey($a['sucursal_id'])->firstOrFail()->getAttribute('tenant_id'),
                    'sucursal_id' => $a['sucursal_id'],
                ])->id,
            'caja_sesion_id' => fn (array $a) => self::cajaAbierta($a['sucursal_id'])?->getKey()
                ?? CajaSesion::factory()->create([
                    'sucursal_id' => $a['sucursal_id'],
                    'usuario_id' => $a['usuario_id'],
                ])->id,
            'descripcion' => fake()->sentence(3),
            'monto' => fake()->randomFloat(2, 1, 100),
        ];
    }

    /**
     * La caja que paso el test, si paso una.
     *
     * @param  array<string, mixed>  $a
     */
    private static function cajaDada(array $a): ?CajaSesion
    {
        $caja = $a['caja_sesion_id'] ?? null;

        if ($caja === null || $caja instanceof Closure) {
            return null;
        }

        $id = $caja instanceof Model ? $caja->getKey() : $caja;

        return CajaSesion::query()->withoutGlobalScopes()->whereKey($id)->firstOrFail();
    }

    /** La caja abierta de la sucursal (a lo sumo una), si existe. */
    private static function cajaAbierta(mixed $sucursalId): ?CajaSesion
    {
        return CajaSesion::query()->withoutGlobalScopes()
            ->where('sucursal_id', $sucursalId)
            ->where('estado', 'abierta')
            ->first();
    }
}
