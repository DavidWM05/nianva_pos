<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Produccion\Dtos\InsumoDto;
use Illuminate\Validation\Rule;

class CrearInsumoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'nombre' => 'required|string|max:200',
            'sku' => ['nullable', 'string', 'max:50', Rule::unique('insumos', 'sku')->where('tenant_id', $tenantId)],
            'unidad_medida_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('unidades_medida', $tenantId)],
            'costo' => 'nullable|numeric|min:0',
            'stock_minimo' => 'nullable|numeric|min:0',
        ];
    }

    public function toDto(): InsumoDto
    {
        $v = $this->validated();

        return new InsumoDto(
            nombre: (string) $v['nombre'],
            sku: isset($v['sku']) ? (string) $v['sku'] : null,
            unidadMedidaId: (int) $v['unidad_medida_id'],
            costo: isset($v['costo']) ? (float) $v['costo'] : null,
            stockMinimo: isset($v['stock_minimo']) ? (float) $v['stock_minimo'] : null,
            presentes: array_keys($v),
        );
    }
}
