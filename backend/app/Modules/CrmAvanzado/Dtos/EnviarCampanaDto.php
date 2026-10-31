<?php

namespace App\Modules\CrmAvanzado\Dtos;

final readonly class EnviarCampanaDto
{
    /**
     * @param  list<int>|null  $clienteIds
     */
    public function __construct(
        public ?string $segmento,
        public ?array $clienteIds,
        public string $asunto,
        public string $mensaje,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'segmento' => $this->segmento,
            'cliente_ids' => $this->clienteIds,
            'asunto' => $this->asunto,
            'mensaje' => $this->mensaje,
        ];
    }
}
