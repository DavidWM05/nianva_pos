<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Database\Factories\VentaLineaReglaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DAT-03: una regla combinada en una línea de venta, con su nombre y descuento copiados. Sin
 * tenant_id propio: el aislamiento se resuelve por la línea y su documento (tenantRelacion()).
 *
 * @property int $id
 * @property int $venta_detalle_id
 * @property int $regla_precio_id
 * @property string $regla_nombre
 * @property string $descuento
 */
#[Fillable(['venta_detalle_id', 'regla_precio_id', 'regla_nombre', 'descuento'])]
class VentaLineaRegla extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<VentaLineaReglaFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'venta_linea_reglas';

    protected function casts(): array
    {
        return ['descuento' => 'decimal:2'];
    }

    /**
     * Como el de BelongsToTenantViaRelacion, con el tipo del modelo.
     *
     * @return Builder<VentaLineaRegla>
     */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    public static function tenantRelacion(): string
    {
        return 'linea.venta';
    }

    /** @return BelongsTo<VentaDetalle, $this> */
    public function linea(): BelongsTo
    {
        return $this->belongsTo(VentaDetalle::class, 'venta_detalle_id');
    }
}
