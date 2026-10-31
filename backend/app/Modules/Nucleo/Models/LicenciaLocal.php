<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Database\Factories\LicenciaLocalFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id', 'tipo', 'plan_id', 'fecha_inicio', 'fecha_expiracion',
    'estado', 'token_firmado', 'ultima_validacion',
])]
class LicenciaLocal extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<LicenciaLocalFactory> */
    use HasFactory;

    protected $table = 'licencia_local';

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'fecha_expiracion' => 'date',
            'ultima_validacion' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(PlanSuscripcion::class, 'plan_id');
    }

    /**
     * Mismo patron que ConfiguracionTenant::actual()/ConfiguracionSeguridad::actual().
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
