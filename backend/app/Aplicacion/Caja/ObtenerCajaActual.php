<?php

namespace App\Aplicacion\Caja;

use App\Modules\Gastos\Services\GastoService;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Services\CajaService;

/**
 * Caso de uso de lectura de la caja actual que cruza Tpv con Gastos
 * (ARQ-03). Solo lectura: no abre transaccion.
 */
class ObtenerCajaActual
{
    public function __construct(
        private readonly CajaService $cajaService,
        private readonly GastoService $gastoService,
    ) {}

    /**
     * @return array{
     *     sesion: ?CajaSesion,
     *     resumen: ?array{ventas_count: int, total_ventas: float, total_gastos: float},
     *     permisos: array{abrir: bool, cerrar: bool, gastos_ver: bool, gastos_crear: bool}
     * }
     */
    public function ejecutar(Usuario $usuario): array
    {
        $sesion = CajaSesion::where('sucursal_id', $usuario->getAttribute('sucursal_id'))
            ->where('estado', 'abierta')
            ->latest('id')
            ->first();

        return [
            'sesion' => $sesion,
            'resumen' => $sesion ? [
                ...$this->cajaService->resumenSesion($sesion),
                'total_gastos' => $this->gastoService->totalGastos($sesion->id),
            ] : null,
            'permisos' => [
                'abrir' => $usuario->tienePermiso('caja.abrir'),
                'cerrar' => $usuario->tienePermiso('caja.cerrar'),
                'gastos_ver' => $usuario->tienePermiso('gastos.ver'),
                'gastos_crear' => $usuario->tienePermiso('gastos.crear'),
            ],
        ];
    }
}
