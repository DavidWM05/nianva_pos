<?php

namespace App\Modules\UnidadesMedida\Services;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\UnidadesMedida\Exceptions\UnidadEnUsoException;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para gestionar unidades de medida.
 */
class UnidadMedidaService
{
    public function listarActivas(int $tenantId): Collection
    {
        return UnidadMedida::where('activo', true)
            ->orderBy('nombre')
            ->get();
    }

    public function crear(array $data): UnidadMedida
    {
        if (trim($data['nombre'] ?? '') === '') {
            throw new InvalidArgumentException('El nombre de la unidad de medida no puede estar vacio.');
        }

        if (trim($data['abreviatura'] ?? '') === '') {
            throw new InvalidArgumentException('La abreviatura no puede estar vacia.');
        }

        return DB::transaction(function () use ($data) {
            return UnidadMedida::create([
                'tenant_id' => $data['tenant_id'],
                'nombre' => trim($data['nombre']),
                'abreviatura' => trim($data['abreviatura']),
                'tipo' => $data['tipo'] ?? 'entero',
                'activo' => true,
            ]);
        });
    }

    public function actualizar(int $id, array $data): UnidadMedida
    {
        $unidad = UnidadMedida::findOrFail($id);

        return DB::transaction(function () use ($unidad, $data) {
            $unidad->update([
                'nombre' => trim($data['nombre'] ?? $unidad->nombre),
                'abreviatura' => trim($data['abreviatura'] ?? $unidad->abreviatura),
                'tipo' => $data['tipo'] ?? $unidad->tipo,
                'activo' => $data['activo'] ?? $unidad->activo,
            ]);

            return $unidad->fresh();
        });
    }

    public function eliminar(int $id): void
    {
        $unidad = UnidadMedida::findOrFail($id);

        DB::transaction(function () use ($unidad) {
            $enUso = ProductoVariante::sinTenant()
                ->where('unidad_medida_id', $unidad->id)
                ->exists();

            if ($enUso) {
                throw new UnidadEnUsoException($unidad->id);
            }

            $unidad->delete();
        });
    }
}
