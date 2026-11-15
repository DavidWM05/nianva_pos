<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Produccion\Dtos\CrearRecetaDto;
use App\Modules\Produccion\Dtos\IngredienteRecetaDto;

class CrearRecetaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'nombre' => 'required|string|max:200',
            'rendimiento' => ['nullable', ...ReglasCantidad::paraVariante($tenantId)],
            'instrucciones' => 'nullable|string',
            'descripcion' => 'nullable|string',
            'ingredientes' => 'required|array|min:1',
            'ingredientes.*.insumo_id' => ['required', 'integer', ReglasTenant::existe('insumos', $tenantId)],
            'ingredientes.*.cantidad' => ['required', ...ReglasCantidad::decimal()],
            'ingredientes.*.unidad_medida_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('unidades_medida', $tenantId)],
        ];
    }

    public function toDto(): CrearRecetaDto
    {
        $v = $this->validated();

        $ingredientes = array_values(array_map(
            function (mixed $ingrediente): IngredienteRecetaDto {
                $ingrediente = (array) $ingrediente;

                return new IngredienteRecetaDto(
                    insumoId: (int) $ingrediente['insumo_id'],
                    cantidad: (float) $ingrediente['cantidad'],
                    unidadMedidaId: (int) $ingrediente['unidad_medida_id'],
                );
            },
            (array) ($v['ingredientes'] ?? []),
        ));

        return new CrearRecetaDto(
            varianteId: (int) $v['variante_id'],
            nombre: (string) $v['nombre'],
            rendimiento: isset($v['rendimiento']) ? (float) $v['rendimiento'] : null,
            instrucciones: isset($v['instrucciones']) ? (string) $v['instrucciones'] : null,
            descripcion: isset($v['descripcion']) ? (string) $v['descripcion'] : null,
            ingredientes: $ingredientes,
        );
    }

    public function messages(): array
    {
        return ReglasCantidad::mensajes(['rendimiento', 'ingredientes.*.cantidad']);
    }
}
