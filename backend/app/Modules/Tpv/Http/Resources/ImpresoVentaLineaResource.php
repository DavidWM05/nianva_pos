<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

final class ImpresoVentaLineaResource extends VentaLineaResource
{
    public function __construct(Model $detalle, private readonly ?string $nombreUnidad = null)
    {
        parent::__construct($detalle);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            /** @var string|null */
            'unidad_medida_nombre' => $this->nombreUnidad,
        ];
    }
}
