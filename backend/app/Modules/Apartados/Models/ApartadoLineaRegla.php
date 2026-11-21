<?php

declare(strict_types=1);

namespace App\Modules\Apartados\Models;

use App\Modules\Apartados\Database\Factories\ApartadoLineaReglaFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DAT-03: una regla combinada en una línea de apartado, con su nombre y descuento copiados. Sin
 * tenant_id propio: el aislamiento se resuelve por la línea y su documento (tenantRelacion()).
 *
 * @property int $id
 * @property int $apartado_detalle_id
 * @property int $regla_precio_id
 * @property string $regla_nombre
 * @property string $descuento
 */
#[Fillable(['apartado_detalle_id', 'regla_precio_id', 'regla_nombre', 'descuento'])]
class ApartadoLineaRegla extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<ApartadoLineaReglaFactory> */
    use HasFactory;

    use TieneUlid;

    public $timestamps = false;

    protected $table = 'apartado_linea_reglas';

    protected function casts(): array
    {
        return ['descuento' => 'decimal:2'];
    }

    /**
     * Como el de BelongsToTenantViaRelacion, con el tipo del modelo.
     *
     * @return Builder<ApartadoLineaRegla>
     */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    public static function tenantRelacion(): string
    {
        return 'linea.apartado';
    }

    /** @return BelongsTo<ApartadoDetalle, $this> */
    public function linea(): BelongsTo
    {
        return $this->belongsTo(ApartadoDetalle::class, 'apartado_detalle_id');
    }
}
