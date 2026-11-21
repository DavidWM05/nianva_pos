<?php

declare(strict_types=1);

namespace App\Aplicacion\Supervisor;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Nucleo\Dtos\AutorizarSupervisorDto;
use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Exceptions\SupervisorIntentosAgotadosException;
use App\Modules\Nucleo\Exceptions\SupervisorInvalidoException;
use App\Modules\Nucleo\Exceptions\SupervisorRequeridoException;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use LogicException;

final class Supervisor
{
    /** @return array{token: string, vence_en: string} */
    public function emitir(Usuario $usuario, AutorizarSupervisorDto $dto, ?string $sesionHash): array
    {
        $tenantId = $usuario->getAttribute('tenant_id');
        abort_if($tenantId === null, 403);
        $sucursalId = $this->sucursalDeOperacion($usuario, $dto);
        abort_if($sucursalId === 0, 403);
        $llave = 'seg05:intentos:'.$usuario->id;

        return Cache::lock($llave.':mutex', 10)->block(3, function () use ($usuario, $dto, $sesionHash, $tenantId, $sucursalId, $llave): array {
            if (RateLimiter::tooManyAttempts($llave, 5)) {
                $this->auditar($usuario, $dto->accion, 'limitada');
                throw new SupervisorIntentosAgotadosException;
            }

            $supervisor = Usuario::query()->where('tenant_id', $tenantId)->where('activo', true)->find($dto->supervisorId);
            $pinHash = $supervisor?->getAttribute('pin_caja_hash');

            if ($supervisor === null || ! is_string($pinHash)
                || ! $supervisor->tienePermiso('supervisor.autorizar')
                || ! $supervisor->tienePermiso($dto->accion->permiso())
                || ($supervisor->getAttribute('sucursal_id') !== $sucursalId && ! $supervisor->tienePermiso('sucursales.todas'))
                || ! Hash::check($dto->pin, $pinHash)) {
                RateLimiter::hit($llave, 600);
                $this->auditar($usuario, $dto->accion, 'rechazada');
                throw new SupervisorInvalidoException;
            }

            return DB::transaction(function () use ($usuario, $supervisor, $tenantId, $sucursalId, $sesionHash, $dto): array {
                $token = bin2hex(random_bytes(32));
                $vence = now()->addMinutes(2);
                DB::table('autorizaciones_supervisor')->insert([
                    'tenant_id' => $tenantId,
                    'sucursal_id' => $sucursalId,
                    'solicitante_id' => $usuario->id,
                    'supervisor_id' => $supervisor->id,
                    'token_hash' => hash('sha256', $token),
                    'accion' => $dto->accion->value,
                    'recurso' => $dto->recurso,
                    'huella' => $dto->huella,
                    'sesion_hash' => $sesionHash,
                    'vence_en' => $vence,
                ]);
                $this->auditar($usuario, $dto->accion, 'concedida', $supervisor->id);

                return ['token' => $token, 'vence_en' => $vence->toAtomString()];
            });
        });
    }

    public static function consumir(?OperacionSupervisorDto $operacion, AccionSupervisor $accion, ?string $recurso = null, ?int $sucursalId = null): void
    {
        if ($operacion?->token === null) {
            if (config()->boolean('supervisor.exigir')) {
                throw new SupervisorRequeridoException;
            }

            return;
        }

        if (DB::transactionLevel() === 0) {
            throw new LogicException('La autorización se consume en la transacción de la operación.');
        }

        $usuario = $operacion->usuario;
        $hash = hash('sha256', $operacion->token);
        $tabla = DB::table('autorizaciones_supervisor')
            ->where('tenant_id', $usuario->getAttribute('tenant_id'))
            ->where('token_hash', $hash);
        $fila = $tabla->lockForUpdate()->first();

        $coincide = hash_equals($fila->token_hash ?? str_repeat('0', 64), $hash);
        if (! $coincide || $fila === null || $fila->consumida_en !== null
            || $fila->vence_en <= now()->toDateTimeString()
            || (int) $fila->solicitante_id !== $usuario->id
            || (int) $fila->sucursal_id !== ($sucursalId ?? (int) $usuario->getAttribute('sucursal_id'))
            || $fila->accion !== $accion->value
            || $fila->recurso !== ($recurso === null ? null : strtolower($recurso))
            || ! hash_equals($fila->huella, $operacion->huella)
            || $fila->sesion_hash !== $operacion->sesionHash) {
            throw new SupervisorInvalidoException;
        }

        $tabla->update(['consumida_en' => now()]);
    }

    private function sucursalDeOperacion(Usuario $usuario, AutorizarSupervisorDto $dto): int
    {
        $consulta = match ($dto->accion) {
            AccionSupervisor::AnularVenta, AccionSupervisor::Reembolsar => Venta::query(),
            AccionSupervisor::CancelarApartado => Apartado::query(),
            AccionSupervisor::CerrarCaja => CajaSesion::query(),
            AccionSupervisor::DescuentoVenta => null,
        };
        $documento = $consulta?->where('ulid', $dto->recurso)->firstOrFail();

        return (int) ($dto->accion === AccionSupervisor::Reembolsar
            ? $usuario->getAttribute('sucursal_id')
            : ($documento?->getAttribute('sucursal_id') ?? $usuario->getAttribute('sucursal_id')));
    }

    private function auditar(Usuario $usuario, AccionSupervisor $accion, string $resultado, ?int $supervisorId = null): void
    {
        Auditoria::query()->create([
            'tenant_id' => $usuario->getAttribute('tenant_id'),
            'tabla_afectada' => 'autorizaciones_supervisor',
            'registro_id' => $usuario->id,
            'accion' => 'update',
            'usuario_id' => $usuario->id,
            'cambios' => ['accion' => $accion->value, 'resultado' => $resultado, 'supervisor_id' => $supervisorId],
        ]);
    }
}
