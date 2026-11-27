<?php

declare(strict_types=1);

namespace App\Aplicacion\Caja;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Exceptions\ConsolidacionCajaNoDisponibleException;
use App\Modules\Tpv\Models\CajaConsolidado;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;

final class ConsolidarCajas
{
    /** @return Collection<int, CajaConsolidado> */
    public function ejecutar(Usuario $usuario, string $fecha): Collection
    {
        return DB::transaction(function () use ($usuario, $fecha): Collection {
            $sucursal = $this->sucursal($usuario)->lockForUpdate()->firstOrFail();
            $cortes = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', $sucursal->id)
                ->where('fecha_operativa', $fecha)->orderBy('id')->lockForUpdate()->get();

            if ($cortes->contains('estado', 'abierta')) {
                throw new ConsolidacionCajaNoDisponibleException($fecha, 'cajas_abiertas');
            }
            $pendientes = $cortes->whereNull('caja_consolidado_id');
            if ($pendientes->isEmpty()) {
                throw new ConsolidacionCajaNoDisponibleException($fecha, 'sin_cortes_pendientes');
            }

            $original = CajaConsolidado::sinTenant()->where('sucursal_id', $sucursal->id)
                ->where('fecha_operativa', $fecha)->whereNull('original_id')->first();
            if ($original === null) {
                return new Collection([$this->guardar($usuario, $fecha, $pendientes)]);
            }

            $documentos = new Collection;
            foreach ($pendientes as $corte) {
                if ($corte->getAttribute('supervisor_apertura_id') === null) {
                    throw new LogicException('Un corte tardío debe conservar su supervisor de apertura.');
                }
                $documentos->push($this->guardar($usuario, $fecha, [$corte], $original, (int) $corte->getAttribute('supervisor_apertura_id')));
            }

            return $documentos;
        });
    }

    /** @return array{sucursal: Sucursal, documentos: Collection<int, CajaConsolidado>, total_teorico: string, total_contado: string, diferencia: string} */
    public function consultar(Usuario $usuario, string $fecha): array
    {
        $sucursal = $this->sucursal($usuario)->firstOrFail();
        $documentos = CajaConsolidado::sinTenant()->where('sucursal_id', $sucursal->id)
            ->where('fecha_operativa', $fecha)->with(['cortes.terminal', 'original', 'supervisorApertura'])->orderBy('id')->get();

        return [
            'sucursal' => $sucursal,
            'documentos' => $documentos,
            ...$this->sumar($documentos, 'total_contado'),
        ];
    }

    /** @param iterable<CajaSesion> $cortes */
    private function guardar(Usuario $usuario, string $fecha, iterable $cortes, ?CajaConsolidado $original = null, ?int $supervisor = null): CajaConsolidado
    {
        $documento = CajaConsolidado::query()->create([
            'sucursal_id' => $usuario->getAttribute('sucursal_id'),
            'fecha_operativa' => $fecha,
            'usuario_id' => $usuario->id,
            'fecha_cierre' => now(),
            'original_id' => $original?->id,
            'supervisor_apertura_id' => $supervisor,
            ...$this->sumar($cortes, 'monto_cierre'),
        ]);
        foreach ($cortes as $corte) {
            $corte->update(['caja_consolidado_id' => $documento->id]);
        }

        return $documento;
    }

    /** @return Builder<Sucursal> */
    private function sucursal(Usuario $usuario): Builder
    {
        return Sucursal::sinTenant()->where('tenant_id', $usuario->getAttribute('tenant_id'))
            ->whereKey((int) $usuario->getAttribute('sucursal_id'));
    }

    /** @param iterable<CajaSesion|CajaConsolidado> $filas
     * @return array{total_teorico: string, total_contado: string, diferencia: string}
     */
    private function sumar(iterable $filas, string $campoContado): array
    {
        $teorico = Dinero::desde('0');
        $contado = Dinero::desde('0');
        foreach ($filas as $fila) {
            $teorico = $teorico->sumar(Dinero::desde((string) $fila->getAttribute('total_teorico')));
            $contado = $contado->sumar(Dinero::desde((string) $fila->getAttribute($campoContado)));
        }

        return ['total_teorico' => $teorico->aCadena(), 'total_contado' => $contado->aCadena(), 'diferencia' => $contado->restar($teorico)->aCadena()];
    }
}
