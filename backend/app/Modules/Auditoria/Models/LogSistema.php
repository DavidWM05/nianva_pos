<?php

namespace App\Modules\Auditoria\Models;

use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Log tecnico de errores/eventos de infraestructura -- NO de negocio.
 *
 * Deliberadamente NO usa BelongsToTenant/TenantScope, a diferencia de
 * Auditoria. Motivo: logs_sistema.tenant_id es NULLABLE en el schema a
 * proposito, porque muchos de los eventos que aqui se registran ocurren
 * ANTES o FUERA de que exista un tenant resoluble -- un fallo dentro del
 * propio ResolveTenant, un job en cola sin usuario autenticado, un error de
 * conexion a base de datos, un comando artisan de mantenimiento. Auditoria,
 * en cambio, siempre nace de una accion de negocio sobre un registro que ya
 * pertenece a un tenant concreto (tenant_id NOT NULL alli).
 *
 * Si esta clase llevara TenantScope, cualquier log sin contexto de tenant
 * resuelto (que es el caso mas comun para errores tecnicos) quedaria
 * invisible salvo llamando sinTenant() -- exactamente al reves de lo que se
 * necesita: quien revisa logs_sistema (el operador de la plataforma) quiere
 * verlos TODOS por defecto, no filtrados por el tenant activo de la request
 * que fallo.
 */
#[Fillable([
    'tenant_id', 'producto_origen', 'modulo_origen', 'nivel', 'mensaje',
    'stack_trace', 'contexto', 'usuario_id', 'resuelto',
])]
class LogSistema extends Model
{
    const UPDATED_AT = null;

    protected $table = 'logs_sistema';

    protected function casts(): array
    {
        return [
            'contexto' => 'array',
            'resuelto' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    /**
     * Punto de entrada pensado para que cualquier modulo escriba en
     * logs_sistema sin acoplarse a Auditoria ni a Auditable -- solo
     * necesita conocer este modelo.
     *
     * @param  'info'|'warning'|'error'|'critical'  $nivel
     */
    public static function registrar(
        string $nivel,
        string $moduloOrigen,
        string $mensaje,
        array $contexto = [],
        ?string $stackTrace = null,
    ): self {
        return static::create([
            'tenant_id' => app(TenantContext::class)->id(),
            'producto_origen' => config('app.name', 'nucleo'),
            'modulo_origen' => $moduloOrigen,
            'nivel' => $nivel,
            'mensaje' => mb_substr($mensaje, 0, 500),
            'stack_trace' => $stackTrace,
            'contexto' => $contexto === [] ? null : $contexto,
            'usuario_id' => Auth::id(),
        ]);
    }
}
