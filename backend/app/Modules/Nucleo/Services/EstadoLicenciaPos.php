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

    /** @return 'revocada'|'instancia_distinta'|'token_invalido'|'gracia_agotada'|null */
    public function motivo(?LicenciaLocal $licencia): ?string
    {
        if ($licencia === null) {
            return null;
        }

        if ($licencia->getAttribute('estado') === 'revocada') {
            return 'revocada';
        }

        if ($licencia->getAttribute('rechazo_remoto') !== null) {
            return $licencia->getAttribute('rechazo_remoto') === 'instancia_distinta' ? 'instancia_distinta' : 'token_invalido';
        }

        $datos = $this->verificar($licencia);
        if ($datos === null) {
            return $licencia->tieneCredencial() ? 'token_invalido' : null;
        }

        if ($datos['tipo'] === 'pago_unico') {
            return null;
        }

        return $this->agotada($licencia, $datos['fecha_expiracion']) ? 'gracia_agotada' : null;
    }

    /** @return array{estado: 'sin_licencia'|'activa'|'prueba'|'vencida'|'revocada', modo_operativo: 'operativa'|'solo_lectura', motivo: 'revocada'|'instancia_distinta'|'token_invalido'|'gracia_agotada'|null, gracia_hasta: string|null, soporte_hasta: string|null} */
    public function paraSesion(int $tenantId): array
    {
        $licencia = $this->licencia($tenantId);
        $motivo = $this->motivo($licencia);
        $estado = match (true) {
            $licencia === null || ! $licencia->tieneCredencial() => 'sin_licencia',
            $motivo === 'revocada' => 'revocada',
            $motivo === 'gracia_agotada', $licencia->getAttribute('estado') === 'vencida' => 'vencida',
            $licencia->getAttribute('estado') === 'prueba' => 'prueba',
            default => 'activa',
        };

        return [
            'estado' => $estado,
            'modo_operativo' => $motivo === null ? 'operativa' : 'solo_lectura',
            'motivo' => $motivo,
            'gracia_hasta' => $licencia === null ? null : $this->graciaHasta($licencia)?->utc()->format('Y-m-d\TH:i:s\Z'),
            'soporte_hasta' => $licencia === null ? null : ($this->verificar($licencia)['soporte_hasta'] ?? null),
        ];
    }

    public function agotada(LicenciaLocal $licencia, ?string $fecha): bool
    {
        $inicio = $this->inicioGracia($licencia, $fecha);

        return $inicio === null || $this->reloj->now() >= $this->finGracia($inicio);
    }

    public function enGracia(LicenciaLocal $licencia): bool
    {
        return $this->graciaHasta($licencia) !== null;
    }

    private function graciaHasta(LicenciaLocal $licencia): ?CarbonImmutable
    {
        $datos = $this->verificar($licencia);
        if ($datos === null || $datos['tipo'] === 'pago_unico' || $this->motivo($licencia) !== null) {
            return null;
        }

        $inicio = $this->inicioGracia($licencia, $datos['fecha_expiracion']);

        $vence = $datos['fecha_expiracion'];

        return $inicio !== null && ($licencia->getAttribute('estado') === 'vencida'
            || ($vence !== null && $this->reloj->now() >= CarbonImmutable::parse($vence, 'UTC')->startOfDay())
            || $this->reloj->now() >= $inicio->addDay()) ? $this->finGracia($inicio) : null;
    }

    private function finGracia(CarbonImmutable $inicio): CarbonImmutable
    {
        return $inicio->utc()->addDays(7);
    }

    private function inicioGracia(LicenciaLocal $licencia, ?string $fecha): ?CarbonImmutable
    {
        $confirmacion = $licencia->getAttribute('ultima_validacion')?->toImmutable()->utc();
        if ($confirmacion === null || $fecha === null) {
            return $confirmacion;
        }

        return $confirmacion->min(CarbonImmutable::parse($fecha, 'UTC')->startOfDay());
    }
}
