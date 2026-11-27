<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Services;

use App\Modules\Nucleo\Models\LicenciaLocal;
use Carbon\CarbonImmutable;
use Psr\Clock\ClockInterface;

final class EstadoLicenciaPos
{
    public function __construct(
        private readonly TokenLicenciaPos $tokens,
        private readonly IdentidadLicencia $identidad,
        private readonly ClockInterface $reloj,
    ) {}

    public function licencia(int $tenantId): ?LicenciaLocal
    {
        return LicenciaLocal::sinTenant()->where('tenant_id', $tenantId)->first();
    }

    /** @return array{tipo: string, fecha_expiracion: ?string, soporte_hasta: ?string, concesion: array{plan_codigo: string, features: list<string>, cuotas: array{terminales: int, sucursales: int}}|null}|null */
    public function verificar(LicenciaLocal $licencia): ?array
    {
        $token = $licencia->getAttribute('token_firmado');

        return is_string($token) && $token !== ''
            ? $this->tokens->verificar($token, $this->identidad->identificador())
            : null;
    }

    public function motivo(?LicenciaLocal $licencia): ?string
    {
        if ($licencia === null) {
            return null;
        }

        if ($licencia->getAttribute('estado') === 'revocada') {
            return 'revocada';
        }

        if ($licencia->getAttribute('rechazo_remoto') !== null) {
            return $licencia->getAttribute('rechazo_remoto');
        }

        $datos = $this->verificar($licencia);
        if ($datos === null) {
            return $licencia->getAttribute('codigo_activacion') === null && $licencia->getAttribute('token_firmado') === null
                ? null : 'token_invalido';
        }

        if ($datos['tipo'] === 'pago_unico') {
            return null;
        }

        return $this->agotada($licencia, $datos['fecha_expiracion']) ? 'gracia_agotada' : null;
    }

    public function agotada(LicenciaLocal $licencia, ?string $fecha): bool
    {
        $inicio = $this->inicioGracia($licencia, $fecha);

        return $inicio === null || $this->reloj->now() >= $inicio->addDays(7);
    }

    public function enGracia(LicenciaLocal $licencia): bool
    {
        $datos = $this->verificar($licencia);
        if ($datos === null || $datos['tipo'] === 'pago_unico' || $this->motivo($licencia) !== null) {
            return false;
        }

        $inicio = $this->inicioGracia($licencia, $datos['fecha_expiracion']);

        $vence = $datos['fecha_expiracion'];

        return $inicio !== null && ($licencia->getAttribute('estado') === 'vencida'
            || ($vence !== null && $this->reloj->now() >= CarbonImmutable::parse($vence, 'UTC')->startOfDay())
            || $this->reloj->now() >= $inicio->addDay());
    }

    private function inicioGracia(LicenciaLocal $licencia, ?string $fecha): ?CarbonImmutable
    {
        $confirmacion = $licencia->getAttribute('ultima_validacion')?->toImmutable();
        if ($confirmacion === null || $fecha === null) {
            return $confirmacion;
        }

        return $confirmacion->min(CarbonImmutable::parse($fecha, 'UTC')->startOfDay());
    }
}
