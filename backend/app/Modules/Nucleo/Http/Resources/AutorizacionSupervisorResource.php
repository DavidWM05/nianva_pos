<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property array{token: string, vence_en: string} $resource */
final class AutorizacionSupervisorResource extends JsonResource
{
    /** @return array{token: string, vence_en: string} */
    public function toArray(Request $request): array
    {
        return $this->resource;
    }
}
