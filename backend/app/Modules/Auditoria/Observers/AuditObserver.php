<?php

namespace App\Modules\Auditoria\Observers;

use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Escribe en auditoria a partir de los eventos created/updated/deleted de
 * cualquier modelo listado en config('auditoria.auditables'). Registrado
 * desde AuditoriaServiceProvider via Model::observe() -- generico, no
 * conoce ningun modelo en particular (ni Usuario, ni Rol, ni ninguno
 * futuro), asi que ese modelo no necesita importar nada de Auditoria.
 */
class AuditObserver
{
    /**
     * Campos que nunca se registran en el diff: credenciales, timestamps
     * automaticos, y el secreto/codigos de 2FA (aunque viajan encriptados
     * via el cast de Eloquent, no tiene sentido acumular ese material en
     * el log de auditoria).
     */
    private const CAMPOS_EXCLUIDOS = [
        'password', 'remember_token', 'created_at', 'updated_at', 'deleted_at',
        'two_factor_secret', 'two_factor_recovery_codes',
    ];

    public function created(Model $model): void
    {
        $this->registrar($model, 'create', $this->diffCreacion($model));
    }

    public function updated(Model $model): void
    {
        $cambios = $this->diffActualizacion($model);

        if ($cambios === []) {
            return;
        }

        $this->registrar($model, 'update', $cambios);
    }

    public function deleted(Model $model): void
    {
        $this->registrar($model, 'delete', $this->diffEliminacion($model));
    }

    private function diffCreacion(Model $model): array
    {
        $cambios = [];

        foreach ($model->getAttributes() as $campo => $valor) {
            if (in_array($campo, self::CAMPOS_EXCLUIDOS, true)) {
                continue;
            }

            $cambios[$campo] = ['antes' => null, 'despues' => $valor];
        }

        return $cambios;
    }

    private function diffActualizacion(Model $model): array
    {
        $cambios = [];

        foreach ($model->getChanges() as $campo => $despues) {
            if (in_array($campo, self::CAMPOS_EXCLUIDOS, true)) {
                continue;
            }

            $cambios[$campo] = ['antes' => $model->getOriginal($campo), 'despues' => $despues];
        }

        return $cambios;
    }

    private function diffEliminacion(Model $model): array
    {
        $cambios = [];

        foreach ($model->getAttributes() as $campo => $valor) {
            if (in_array($campo, self::CAMPOS_EXCLUIDOS, true)) {
                continue;
            }

            $cambios[$campo] = ['antes' => $valor, 'despues' => null];
        }

        return $cambios;
    }

    /**
     * auditoria.tenant_id es NOT NULL. Si el modelo auditado no tiene
     * tenant_id propio (ej. un rol de sistema) y tampoco hay un tenant
     * activo en TenantContext, no hay a que tenant atribuir el registro:
     * se descarta el evento en vez de forzar un valor o violar la
     * constraint.
     */
    private function registrar(Model $model, string $accion, array $cambios): void
    {
        $tenantId = $model->getAttribute('tenant_id') ?? app(TenantContext::class)->id();

        if ($tenantId === null) {
            return;
        }

        Auditoria::create([
            'tenant_id' => $tenantId,
            'tabla_afectada' => $model->getTable(),
            'registro_id' => $model->getKey(),
            'accion' => $accion,
            'usuario_id' => Auth::id(),
            'cambios' => $cambios === [] ? null : $cambios,
            'ip' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 255),
        ]);
    }
}
