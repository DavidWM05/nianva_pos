<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\ProductoVarianteDto;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Support\CodigoEnOtroCatalogo;
use App\Modules\Inventario\Support\ReglasAtributo;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GuardarProductoVarianteRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $variante = $this->route('variante');
        $varianteId = $variante instanceof ProductoVariante ? $variante->id : null;

        return [
            'precio_venta' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'costo' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'codigo_barras' => [
                'nullable', 'string', 'max:50',
                new CodigoEnOtroCatalogo('presentaciones', $this->tenantId()),
                Rule::unique('producto_variantes', 'codigo_barras')
                    ->where('tenant_id', $this->tenantId())
                    ->ignore($varianteId),
            ],
            // ARQ-07: ids de atributo_valores, a lo mas uno por atributo. Si llega, reemplaza los
            // valores de la variante; si no llega, se conservan.
            'valores' => ['sometimes', 'array'],
            'valores.*' => ['integer', 'distinct', ReglasAtributo::valorDelTenant($this->tenantId())],
        ];
    }

    public function toDto(): ProductoVarianteDto
    {
        $v = $this->validated();

        $valores = null;
        if (array_key_exists('valores', $v)) {
            $valores = array_values(array_map('intval', (array) $v['valores']));
            $atributos = AtributoValor::query()->whereIn('id', $valores)->pluck('atributo_id');
            if ($atributos->count() !== $atributos->unique()->count()) {
                throw ValidationException::withMessages(['valores' => ['Elige un solo valor por atributo.']]);
            }
        }

        return new ProductoVarianteDto(
            codigoBarras: isset($v['codigo_barras']) ? (string) $v['codigo_barras'] : null,
            presentes: array_values(array_diff(array_keys($v), ['valores'])),
            precioVenta: isset($v['precio_venta']) ? (string) $v['precio_venta'] : null,
            costo: isset($v['costo']) ? (string) $v['costo'] : null,
            valores: $valores,
        );
    }
}
