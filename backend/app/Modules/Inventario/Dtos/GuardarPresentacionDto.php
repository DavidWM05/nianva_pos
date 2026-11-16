<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Dtos;

final readonly class GuardarPresentacionDto
{
    /** @param list<string> $presentes */
    public function __construct(public string $nombre, public string $factor, public ?string $codigoBarras, public ?string $precioVenta, public array $presentes) {}

    /** @return array<string, mixed> */
    public function datos(): array
    {
        $r = ['nombre' => $this->nombre, 'factor' => $this->factor];
        if (in_array('codigo_barras', $this->presentes, true)) {
            $r['codigo_barras'] = $this->codigoBarras;
        }if (in_array('precio_venta', $this->presentes, true)) {
            $r['precio_venta'] = $this->precioVenta;
        }

        return $r;
    }
}
