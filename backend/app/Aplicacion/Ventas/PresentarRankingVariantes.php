<?php

declare(strict_types=1);

namespace App\Aplicacion\Ventas;

use App\Modules\Metricas\Services\VentasComerciales;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Database\Eloquent\Builder;

final readonly class PresentarRankingVariantes
{
    public function __construct(private VentasComerciales $ventas) {}

    /** @return list<array{unidad: array{id: int, nombre: ?string}, variantes: list<array{variante_id: int, producto_nombre: ?string, cantidad_base: string}>}> */
    public function ejecutar(ContextoMetricas $contexto): array
    {
        $grupos = $this->ventas->rankingVariantes($contexto);
        $nombres = UnidadMedida::query()->whereIn('id', array_keys($grupos))
            ->where(fn (Builder $consulta) => $consulta->whereNull('tenant_id')->orWhere('tenant_id', $contexto->tenantId))
            ->pluck('nombre', 'id');
        $resultado = [];

        foreach ($grupos as $id => $variantes) {
            $nombre = $nombres->get($id);
            $resultado[] = [
                'unidad' => ['id' => (int) $id, 'nombre' => $nombre === null ? null : (string) $nombre],
                'variantes' => $variantes,
            ];
        }

        return $resultado;
    }
}
