<?php

declare(strict_types=1);

namespace App\Aplicacion\Devoluciones;

use App\Aplicacion\Folios\Folios;
use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Aplicacion\Supervisor\Supervisor;
use App\Modules\Devoluciones\Dtos\CrearDevolucionDto;
use App\Modules\Devoluciones\Dtos\ItemDevueltoDto;
use App\Modules\Devoluciones\Dtos\ItemNuevoDto;
use App\Modules\Devoluciones\Dtos\PagoDevolucionDto;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Services\DevolucionService;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\LibroCaja;
use Illuminate\Support\Facades\DB;

/**
 * Caso de uso de devolucion que cruza Devoluciones con NotasCredito
 * (ARQ-03): la Action orquesta y es dueña de la transaccion.
 */
class RegistrarDevolucion
{
    public function __construct(
        private readonly DevolucionService $devolucionService,
        private readonly RegistrarMovimiento $movimiento,
        private readonly NotaCreditoService $notaCreditoService,
        private readonly LibroCaja $libro,
    ) {}

    /**
     * El savepoint participa de la transacción exterior cuando la llama otra Action.
     *
     * @return array{devolucion: Devolucion, nota_credito: ?NotaCredito}
     */
    public function ejecutar(CrearDevolucionDto $dto, Usuario $usuario, ?OperacionSupervisorDto $autorizacion = null): array
    {
        $ventaId = $dto->ventaId;
        $tipo = $dto->tipo;
        $itemsDevueltos = array_map(
            fn (ItemDevueltoDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
                'va_a_merma' => $item->vaAMerma,
                ...($item->ventaDetalleId === null ? [] : ['venta_detalle_id' => $item->ventaDetalleId]),
            ],
            $dto->itemsDevueltos,
        );
        $itemsNuevos = array_map(
            fn (ItemNuevoDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
            ],
            $dto->itemsNuevos,
        );
        $pagos = array_map(
            fn (PagoDevolucionDto $pago) => [
                'metodo_pago_id' => $pago->metodoPagoId,
                'monto' => $pago->monto,
            ],
            $dto->pagos,
        );
        $motivo = $dto->motivo;
        $tipoReembolso = $dto->tipoReembolso;

        return DB::transaction(function () use (
            $ventaId,
            $tipo,
            $itemsDevueltos,
            $itemsNuevos,
            $pagos,
            $motivo,
            $tipoReembolso,
            $usuario,
            $dto,
            $autorizacion,
        ) {
            $sucursalId = (int) $usuario->getAttribute('sucursal_id');
            $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', $sucursalId)->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();
            $ventaOrigen = Venta::query()->whereKey($ventaId)->lockForUpdate()->firstOrFail();
            $variantes = array_values(array_unique(array_merge(
                array_column(array_filter($itemsDevueltos, static fn (array $item): bool => ! $item['va_a_merma']), 'variante_id'),
                array_column($itemsNuevos, 'variante_id'),
            )));
            sort($variantes);
            $stocks = [];
            foreach ($variantes as $varianteId) {
                $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, $sucursalId, 'entrada', 1, 'devolucion', $usuario->id));
            }

            $devolucion = $this->devolucionService->registrarDevolucionConBloqueos(
                ventaOrigen: $ventaOrigen,
                tipo: $tipo,
                itemsDevueltos: $itemsDevueltos,
                itemsNuevos: $itemsNuevos,
                sucursalId: $usuario->sucursal_id,
                usuarioId: $usuario->id,
                pagos: $pagos,
                motivo: $motivo,
                tipoReembolso: $tipoReembolso,
                caja: $caja,
                stocks: $stocks,
                folio: Folios::asignar((int) $ventaOrigen->getAttribute('tenant_id'), $sucursalId, 'D'),
                folioVentaSombra: $tipo === 'cambio' ? Folios::asignar((int) $ventaOrigen->getAttribute('tenant_id'), $sucursalId, 'V') : null,
            );

            $diferencia = Dinero::desde((string) $devolucion->getAttribute('diferencia'));
            $esReembolso = $diferencia->comparar(Dinero::desde('0')) < 0;
            $monetarios = [];
            if ($diferencia->aCadena() !== '0.00' && ! ($esReembolso && $tipoReembolso === 'nota_credito')) {
                foreach ($dto->pagos as $pago) {
                    if ($pago->monto > 0 && $this->libro->esMonetario($pago->metodoPagoId)) {
                        $monetarios[] = $pago;
                    }
                }
            }
            if ($esReembolso && $monetarios !== []) {
                Supervisor::consumir($autorizacion, AccionSupervisor::Reembolsar, (string) $ventaOrigen->getAttribute('ulid'), $sucursalId);
            }
            if ($monetarios !== [] && $caja === null) {
                throw new CajaSesionNoAbiertaException($sucursalId);
            }
            if ($caja !== null && $monetarios !== []) {
                $devolucion->update(['caja_sesion_id' => $caja->id]);
                foreach ($monetarios as $pago) {
                    $monto = Dinero::desde((string) $pago->monto);
                    $this->libro->registrar($caja, 'devolucion', ($esReembolso ? Dinero::desde('0')->restar($monto) : $monto)->aCadena(), 'devoluciones', (int) $devolucion->id, (int) $usuario->id, $pago->metodoPagoId);
                }
            }
            $nota = null;

            if ($tipoReembolso === 'nota_credito' && $devolucion->monto_devolucion > 0) {
                $nota = $this->notaCreditoService->crearDesdeDevolucion($devolucion);
                $devolucion->update(['nota_credito_id' => $nota->id]);
            }

            return ['devolucion' => $devolucion, 'nota_credito' => $nota];
        });
    }
}
