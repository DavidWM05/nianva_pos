<?php

declare(strict_types=1);

namespace App\Aplicacion\Caja;

use App\Aplicacion\Folios\Folios;
use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\Gastos\Services\GastoService;
use App\Modules\GiftCards\Models\GiftCardRecarga;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Support\Facades\DB;

/**
 * Caso de uso de cierre de caja que cruza Tpv con Gastos, CuentasCobrar,
 * CuentasPagar y GiftCards (ARQ-03): la Action orquesta y es dueña de la
 * transaccion.
 */
class CerrarCaja
{
    public function __construct(
        private readonly CajaService $cajaService,
        private readonly GastoService $gastoService,
    ) {}

    /**
     * Si la llama otra Action, su savepoint participa de la transacción exterior.
     *
     * @param  list<array{metodo_pago_id:int,monto:int|float|string}>  $conteos
     * @return array{sesion: CajaSesion, desglose: array<string, float>}
     */
    public function ejecutar(CajaSesion $cajaSesion, array $conteos): array
    {
        return DB::transaction(function () use ($cajaSesion, $conteos) {
            $cajaSesion = CajaSesion::query()->whereKey($cajaSesion->id)->lockForUpdate()->firstOrFail();
            $cajaSesionId = $cajaSesion->id;

            $totalGastos = $this->gastoService->totalGastos($cajaSesionId);
            $totalAbonosCxc = round((float) AbonoCuenta::where('caja_sesion_id', $cajaSesionId)->sum('monto'), 2);
            $totalRecargasGc = round((float) GiftCardRecarga::sinTenant()
                ->where('caja_sesion_id', $cajaSesionId)
                ->sum('monto'), 2);
            $totalPagosCxp = round((float) AbonoPagar::where('caja_sesion_id', $cajaSesionId)->sum('monto'), 2);

            $sesion = $this->cajaService->cerrarCajaConSesion($cajaSesion, $conteos, Folios::asignar((int) $cajaSesion->sucursal()->firstOrFail()->getAttribute('tenant_id'), (int) $cajaSesion->getAttribute('sucursal_id'), 'C'));

            return [
                'sesion' => $sesion,
                'desglose' => [
                    'total_gastos' => $totalGastos,
                    'total_abonos_cxc' => $totalAbonosCxc,
                    'total_recargas_gc' => $totalRecargasGc,
                    'total_pagos_cxp' => $totalPagosCxp,
                ],
            ];
        });
    }
}
