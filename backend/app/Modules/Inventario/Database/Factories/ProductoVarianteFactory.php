<?php

namespace App\Modules\Inventario\Database\Factories;

use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\VarianteAtributoValor;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ProductoVariante> */
class ProductoVarianteFactory extends Factory
{
    protected $model = ProductoVariante::class;

    public function definition(): array
    {
        return [
            'producto_id' => Producto::factory(),
            'codigo_barras' => fake()->unique()->bothify('BAR-####-????'),
            'activo' => true,
        ];
    }

    /**
     * ARQ-07: la variante con valores de atributo, por nombre: `conAtributos(['Atributo' => 'Valor'])`.
     * Crea en el tenant de la variante el atributo y el valor que falten; el orden del atributo
     * nuevo es el del arreglo, que es el del nombre armado.
     *
     * @param  array<string, string>  $atributos
     */
    public function conAtributos(array $atributos): static
    {
        return $this->afterCreating(fn (ProductoVariante $variante) => self::asignarAtributos($variante, $atributos));
    }

    /**
     * Lo mismo que conAtributos() para una variante ya creada (por ejemplo con `ProductoVariante::create()`).
     *
     * @param  array<string, string>  $atributos
     */
    public static function asignarAtributos(ProductoVariante $variante, array $atributos): ProductoVariante
    {
        foreach (self::valores((int) $variante->getAttribute('tenant_id'), $atributos) as $valor) {
            VarianteAtributoValor::query()->updateOrCreate(
                ['variante_id' => $variante->id, 'atributo_id' => $valor->atributo_id],
                ['atributo_valor_id' => $valor->id],
            );
        }

        return $variante->unsetRelation('valoresAtributo');
    }

    /**
     * Los ids de los valores (creados si faltan) para el campo `valores` de un payload de la API.
     *
     * @param  array<string, string>  $atributos
     * @return list<int>
     */
    public static function idsDeValores(int $tenantId, array $atributos): array
    {
        return array_map(fn (AtributoValor $valor) => (int) $valor->id, self::valores($tenantId, $atributos));
    }

    /** El valor que tiene la variante en el atributo con ese nombre, leído de la base; null si no tiene. */
    public static function valorDe(ProductoVariante $variante, string $atributo): ?string
    {
        $fila = VarianteAtributoValor::sinTenant()
            ->with('valor')
            ->where('variante_id', $variante->id)
            ->whereHas('valor.atributo', fn ($q) => $q->where('nombre', $atributo))
            ->first();

        return $fila?->valor?->valor;
    }

    /**
     * @param  array<string, string>  $atributos
     * @return list<AtributoValor>
     */
    private static function valores(int $tenantId, array $atributos): array
    {
        $valores = [];
        foreach ($atributos as $nombre => $texto) {
            $atributo = Atributo::sinTenant()->where('tenant_id', $tenantId)->where('nombre', $nombre)->first()
                ?? Atributo::query()->create([
                    'tenant_id' => $tenantId,
                    'nombre' => $nombre,
                    'orden' => Atributo::sinTenant()->where('tenant_id', $tenantId)->count(),
                ]);
            $valores[] = AtributoValor::sinTenant()->where('atributo_id', $atributo->id)->where('valor', $texto)->first()
                ?? AtributoValor::query()->create(['atributo_id' => $atributo->id, 'valor' => $texto]);
        }

        return $valores;
    }
}
