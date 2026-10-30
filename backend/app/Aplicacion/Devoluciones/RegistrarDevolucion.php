<?php

namespace App\Aplicacion\Devoluciones;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Services\DevolucionService;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;

/**
 * Caso de uso de devolucion que cruza Devoluciones con NotasCredito
 * (ARQ-03): la Action orquesta y es dueña de la transaccion.
 */
class RegistrarDevolucion
{
    public function __construct(
        private readonly DevolucionService $devolucionService,
        private readonly NotaCreditoService $notaCreditoService,
    ) {}

    /**
     * @param  list<array{variante_id:int, cantidad:int, va_a_merma?:bool}>  $itemsDevueltos
     * @param  list<array{variante_id:int, cantidad:int}>  $itemsNuevos
     * @param  list<array{metodo_pago_id:int, monto:float|string}>  $pagos
     * @return array{devolucion: Devolucion, nota_credito: ?NotaCredito}
     */
    public function ejecutar(
        int $ventaId,
        string $tipo,
        array $itemsDevueltos,
        array $itemsNuevos,
        array $pagos,
        ?string $motivo,
        string $tipoReembolso,
        Usuario $usuario,
    ): array {
        return DB::transaction(function () use (
            $ventaId,
            $tipo,
            $itemsDevueltos,
            $itemsNuevos,
            $pagos,
            $motivo,
            $tipoReembolso,
            $usuario,
        ) {
            $ventaOrigen = Venta::findOrFail($ventaId);

            $devolucion = $this->devolucionService->registrarDevolucion(
                ventaOrigen: $ventaOrigen,
                tipo: $tipo,
                itemsDevueltos: $itemsDevueltos,
                itemsNuevos: $itemsNuevos,
                sucursalId: $usuario->sucursal_id,
                usuarioId: $usuario->id,
                pagos: $pagos,
                motivo: $motivo,
                tipoReembolso: $tipoReembolso,
            );

            $nota = null;

            if ($tipoReembolso === 'nota_credito' && $devolucion->monto_devolucion > 0) {
                $nota = $this->notaCreditoService->crearDesdeDevolucion($devolucion);
                $devolucion->update(['nota_credito_id' => $nota->id]);
            }

            return ['devolucion' => $devolucion, 'nota_credito' => $nota];
        });
    }
}
