<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ElegirTerminalDto;
use App\Modules\Nucleo\Support\ReglasTenant;

final class ElegirTerminalRequest extends SolicitudNegocio
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        $sucursalId = $this->user()?->getAttribute('sucursal_id');

        return ['terminal_id' => [
            'required', 'integer', 'min:1',
            ReglasTenant::existe('terminales', $this->tenantId())->where('sucursal_id', $sucursalId ?? 0),
        ]];
    }

    public function toDto(): ElegirTerminalDto
    {
        return new ElegirTerminalDto((int) $this->validated('terminal_id'));
    }
}
