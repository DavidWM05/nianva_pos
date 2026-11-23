<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Valores;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\Dinero;

final readonly class TotalesVentasComerciales
{
    public function __construct(
        public Dinero $vendido,
        public int $tickets,
        public Dinero $mercanciaDevueltaSimple,
        public Dinero $mercanciaRecibidaEnCambios,
        public Dinero $mercanciaEntregadaEnCambios,
    ) {}

    public function promedio(): Dinero
    {
        return $this->tickets === 0 ? Dinero::desde(0) : $this->vendido->proporcion(1, $this->tickets);
    }

    public function neto(): Dinero
    {
        return $this->vendido
            ->restar($this->mercanciaDevueltaSimple)
            ->restar($this->mercanciaRecibidaEnCambios)
            ->sumar($this->mercanciaEntregadaEnCambios);
    }

    /**
     * @return array{vendido: string, tickets: int, ticket_promedio: string, mercancia_devuelta_simple: string, mercancia_recibida_en_cambios: string, mercancia_entregada_en_cambios: string, ventas_netas_comerciales: string}
     */
    public function aArray(): array
    {
        return [
            'vendido' => DecimalApi::dinero($this->vendido->aCadena()),
            'tickets' => $this->tickets,
            'ticket_promedio' => DecimalApi::dinero($this->promedio()->aCadena()),
            'mercancia_devuelta_simple' => DecimalApi::dinero($this->mercanciaDevueltaSimple->aCadena()),
            'mercancia_recibida_en_cambios' => DecimalApi::dinero($this->mercanciaRecibidaEnCambios->aCadena()),
            'mercancia_entregada_en_cambios' => DecimalApi::dinero($this->mercanciaEntregadaEnCambios->aCadena()),
            'ventas_netas_comerciales' => DecimalApi::dinero($this->neto()->aCadena()),
        ];
    }
}
