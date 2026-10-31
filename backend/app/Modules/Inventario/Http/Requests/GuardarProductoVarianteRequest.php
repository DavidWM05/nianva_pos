<?php

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\ProductoVarianteDto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;

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
            'talla' => ['nullable', 'string', 'max:30'],
            'color' => ['nullable', 'string', 'max:30'],
            'codigo_barras' => [
                'nullable', 'string', 'max:50',
                Rule::unique('producto_variantes', 'codigo_barras')
                    ->where('tenant_id', $this->tenantId())
                    ->ignore($varianteId),
            ],
        ];
    }

    public function toDto(): ProductoVarianteDto
    {
        $v = $this->validated();

        return new ProductoVarianteDto(
            talla: isset($v['talla']) ? (string) $v['talla'] : null,
            color: isset($v['color']) ? (string) $v['color'] : null,
            codigoBarras: isset($v['codigo_barras']) ? (string) $v['codigo_barras'] : null,
            presentes: array_keys($v),
        );
    }
}
