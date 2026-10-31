<?php

namespace App\Modules\Configuracion\Models;

use App\Modules\Configuracion\Database\Factories\ConfiguracionTenantFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id', 'moneda', 'mensaje_ticket', 'logo_url', 'mostrar_rfc',
    'mostrar_telefono', 'mostrar_correo', 'backup_auto', 'backup_frecuencia', 'backup_ultimo',
    'codigo_barras_automatico', 'modulos_activos',
])]
class ConfiguracionTenant extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<ConfiguracionTenantFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'configuracion_tenant';

    protected function casts(): array
    {
        return [
            'mostrar_rfc' => 'boolean',
            'mostrar_telefono' => 'boolean',
            'mostrar_correo' => 'boolean',
            'backup_auto' => 'boolean',
            'backup_ultimo' => 'datetime',
            'codigo_barras_automatico' => 'boolean',
            'modulos_activos' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Config del tenant activo resuelta via TenantContext, para que ningun
     * otro modulo tenga que hacer su propio
     * ->where('tenant_id', ...)->first(). Null si el contexto no esta
     * resuelto o no tiene tenant activo (superadmin).
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
