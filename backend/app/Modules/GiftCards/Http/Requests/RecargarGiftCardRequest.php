<?php

namespace App\Modules\GiftCards\Http\Requests;

use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class RecargarGiftCardRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'monto' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function toDto(): RecargarGiftCardDto
    {
        return new RecargarGiftCardDto(
            monto: (float) $this->validated('monto'),
        );
    }
}
