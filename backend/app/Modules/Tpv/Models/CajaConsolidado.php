<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToSucursal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\RutaPorUlid;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Database\Factories\CajaConsolidadoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'sucursal_id', 'fecha_operativa', 'original_id', 'supervisor_apertura_id', 'usuario_id',
    'fecha_cierre', 'total_teorico', 'total_contado', 'diferencia',
])]
final class CajaConsolidado extends Model
{
    use BelongsToSucursal;
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<CajaConsolidadoFactory> */
    use HasFactory;

    use RutaPorUlid;
    use TieneUlid;

    public $timestamps = false;

    protected $table = 'caja_consolidados';

    protected function casts(): array
    {
        return ['total_teorico' => 'decimal:2', 'total_contado' => 'decimal:2', 'diferencia' => 'decimal:2', 'fecha_cierre' => 'datetime'];
    }

    protected static function newFactory(): CajaConsolidadoFactory
    {
        return CajaConsolidadoFactory::new();
    }

    /** @return Builder<self> */
    public static function sinTenant(): Builder
    {
        return self::query()->withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    public static function tenantRelacion(): string
    {
        return 'sucursal';
    }

    /** @return BelongsTo<Sucursal, $this> */
    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    /** @return BelongsTo<CajaConsolidado, $this> */
    public function original(): BelongsTo
    {
        return $this->belongsTo(self::class, 'original_id');
    }

    /** @return BelongsTo<Usuario, $this> */
    public function supervisorApertura(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'supervisor_apertura_id');
    }

    /** @return HasMany<CajaSesion, $this> */
    public function cortes(): HasMany
    {
        return $this->hasMany(CajaSesion::class, 'caja_consolidado_id');
    }
}
