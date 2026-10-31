<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Produccion\Dtos\CrearOrdenProduccionDto;

class CrearOrdenProduccionRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'receta_id' => ['required', 'integer', ReglasTenant::existe('recetas', $this->tenantId())],
            'cantidad_programada' => 'required|integer|min:1',
            'fecha_programada' => 'nullable|date',
            'notas' => 'nullable|string|max:1000',
        ];
    }

    public function toDto(): CrearOrdenProduccionDto
    {
        $v = $this->validated();

        return new CrearOrdenProduccionDto(
            recetaId: (int) $v['receta_id'],
            cantidadProgramada: (int) $v['cantidad_programada'],
            fechaProgramada: isset($v['fecha_programada']) ? (string) $v['fecha_programada'] : null,
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
        );
    }
}
