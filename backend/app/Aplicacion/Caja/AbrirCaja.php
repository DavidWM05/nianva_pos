<?php

declare(strict_types=1);

namespace App\Aplicacion\Caja;

use App\Aplicacion\Planes\CuotasPlan;
use App\Aplicacion\Supervisor\Supervisor;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Metricas\Services\CalendarioMetricas;
use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Exceptions\SupervisorRequeridoException;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Services\Planes;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Tpv\Dtos\AbrirCajaDto;
use App\Modules\Tpv\Exceptions\TerminalRequeridaException;
use App\Modules\Tpv\Models\CajaConsolidado;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Services\CajaService;
use DateTimeZone;
use Illuminate\Support\Facades\DB;

final class AbrirCaja
{
    public function __construct(
        private readonly CajaService $cajaService,
        private readonly CalendarioMetricas $calendario,
        private readonly CuotasPlan $cuotas,
        private readonly Planes $planes,
    ) {}

    /**
     * La sucursal es la fila estable que serializa aperturas sin sesión previa y el cierre consolidado.
     * El índice único sobre terminal_abierta_id garantiza una sola caja abierta por terminal.
     */
    public function ejecutar(AbrirCajaDto $dto, Usuario $usuario, Terminal $terminal, ?OperacionSupervisorDto $autorizacion = null): CajaSesion
    {
        $operacion = function () use ($dto, $usuario, $terminal, $autorizacion): CajaSesion {
            $tenantId = $terminal->tenant_id;
            $this->cuotas->bloquear($tenantId);
            $this->planes->exigir($tenantId, 'caja');
            $this->cuotas->exigir($tenantId, 'terminales', 'apertura');
            $this->cuotas->exigir($tenantId, 'sucursales', 'apertura');
            $sucursal = Sucursal::query()->withoutGlobalScope(TenantScope::class)->whereKey((int) $usuario->getAttribute('sucursal_id'))->lockForUpdate()->firstOrFail();

            $terminal = Terminal::query()->withoutGlobalScope(TenantScope::class)
                ->where('tenant_id', $usuario->getAttribute('tenant_id'))
                ->where('sucursal_id', $sucursal->id)
                ->whereKey($terminal->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $terminal->activo || ! $sucursal->getAttribute('activo')) {
                throw new TerminalRequeridaException;
            }

            $zona = ConfiguracionTenant::sinTenant()->where('tenant_id', $terminal->tenant_id)->value('zona_horaria');
            $apertura = now()->toImmutable()->utc();
            $fechaOperativa = $this->calendario->fechaLocal(new DateTimeZone(is_string($zona) ? $zona : 'America/Mexico_City'), $apertura);

            $original = CajaConsolidado::sinTenant()->where('sucursal_id', $sucursal->id)
                ->where('fecha_operativa', $fechaOperativa)->whereNull('original_id')->first();
            if ($original !== null && $autorizacion?->token === null) {
                throw new SupervisorRequeridoException((string) $original->getAttribute('ulid'));
            }
            $supervisor = $original === null ? null : Supervisor::consumir(
                $autorizacion, AccionSupervisor::AbrirCajaTardia, (string) $original->getAttribute('ulid'), $sucursal->id,
            );

            return $this->cajaService->abrirCajaConSucursal($sucursal, $usuario->id, $dto->montoApertura, $terminal, $fechaOperativa, $apertura, $supervisor);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
