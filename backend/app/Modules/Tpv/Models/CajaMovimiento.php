<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\EsLibroDeMovimientos;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Database\Factories\CajaMovimientoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DAT-04: un renglón del libro de caja. Solo inserción: se escribe desde LibroCaja y actualizar o
 * borrar lanza una excepción. Sin tenant_id propio: aislamiento por la caja y su sucursal.
 *
 * @property int $id
 * @property int $caja_sesion_id
 * @property string $tipo
 * @property string $monto
 * @property string $saldo_antes
 * @property string $saldo_despues
 */
#[Fillable(['caja_sesion_id', 'metodo_pago_id', 'tipo', 'referencia_tabla', 'referencia_id', 'monto', 'saldo_antes', 'saldo_despues', 'usuario_id'])]
class CajaMovimiento extends Model
{
    use BelongsToTenantViaRelacion;
    use EsLibroDeMovimientos;

    /** @use HasFactory<CajaMovimientoFactory> */
    use HasFactory;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'caja_movimientos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2', 'saldo_antes' => 'decimal:2', 'saldo_despues' => 'decimal:2', 'fecha' => 'datetime'];
    }

    /**
     * Como el de BelongsToTenantViaRelacion, con el tipo del modelo.
     *
     * @return Builder<CajaMovimiento>
     */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    public static function tenantRelacion(): string
    {
        return 'caja.sucursal';
    }

    /** @return BelongsTo<CajaSesion, $this> */
    public function caja(): BelongsTo
    {
        return $this->belongsTo(CajaSesion::class, 'caja_sesion_id');
    }
}
