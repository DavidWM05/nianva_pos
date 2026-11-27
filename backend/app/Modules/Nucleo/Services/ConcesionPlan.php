<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

final readonly class ConcesionPlan
{
    /** @param list<string> $features */
    public function __construct(
        public string $codigo,
        public array $features,
        public int $terminales,
        public int $sucursales,
    ) {}

    public function incluye(string $feature): bool
    {
        return in_array($feature, $this->features, true);
    }

    /** @return array{codigo: string, nombre: string, features: list<string>} */
    public function paraSesion(): array
    {
        return ['codigo' => $this->codigo, 'nombre' => match ($this->codigo) {
            'basico' => 'Básico',
            'avanzado' => 'Avanzado',
            'pro' => 'Pro',
            default => $this->codigo,
        }, 'features' => $this->features];
    }
}
