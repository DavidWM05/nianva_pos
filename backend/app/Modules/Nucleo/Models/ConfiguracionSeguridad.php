<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Database\Factories\ConfiguracionSeguridadFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Configuracion de seguridad por tenant (dias de "recordar este
 * dispositivo"). Separada de Configuracion\Models\ConfiguracionTenant a
 * proposito -- ver el comentario en la migracion.
 */
#[Fillable(['tenant_id', 'dias_dispositivo_normal', 'dias_dispositivo_admin'])]
class ConfiguracionSeguridad extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<ConfiguracionSeguridadFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'configuracion_seguridad';

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Config del tenant activo resuelta via TenantContext -- ver
     * ConfiguracionTenant::actual(), mismo patron.
     */
    public static function actual(): ?self
    {
        $tenantId = app(TenantContext::class)->id();

        if ($tenantId === null) {
            return null;
        }

        return static::where('tenant_id', $tenantId)->first();
    }
}
