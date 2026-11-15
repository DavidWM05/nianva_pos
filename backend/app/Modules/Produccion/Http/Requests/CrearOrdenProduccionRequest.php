<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Produccion\Dtos\CrearOrdenProduccionDto;
use App\Modules\Produccion\Models\Receta;

class CrearOrdenProduccionRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $varianteId = Receta::query()->where('tenant_id', $this->tenantId())->whereKey($this->input('receta_id'))->value('variante_id');

        return [
            'receta_id' => ['required', 'integer', ReglasTenant::existe('recetas', $this->tenantId())],
            'cantidad_programada' => ['required', ...ReglasCantidad::paraVariante($this->tenantId(), varianteId: $varianteId === null ? null : (int) $varianteId)],
            'fecha_programada' => 'nullable|date',
            'notas' => 'nullable|string|max:1000',
        ];
    }

    public function toDto(): CrearOrdenProduccionDto
    {
        $v = $this->validated();

        return new CrearOrdenProduccionDto(
            recetaId: (int) $v['receta_id'],
            cantidadProgramada: Cantidad::numero($v['cantidad_programada']),
            fechaProgramada: isset($v['fecha_programada']) ? (string) $v['fecha_programada'] : null,
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
        );
    }

    public function messages(): array
    {
        return ReglasCantidad::mensajes(['cantidad_programada']);
    }
}
