<?php

declare(strict_types=1);

namespace App\Modules\CuentasCobrar\Models;

use App\Modules\CuentasCobrar\Database\Factories\CuentaCobrarMovimientoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\EsLibroDeMovimientos;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DAT-04: un renglón del libro de crédito de una cuenta por cobrar. Solo inserción: actualizar o borrar lanza
 * una excepción. Sin tenant_id propio: aislamiento por su documento.
 *
 * @property int $id
 * @property int $cuenta_cobrar_id
 * @property string $tipo
 * @property string $monto
 * @property string $saldo_antes
 * @property string $saldo_despues
 */
#[Fillable(['cuenta_cobrar_id', 'tipo', 'referencia_tabla', 'referencia_id', 'monto', 'saldo_antes', 'saldo_despues', 'usuario_id'])]
class CuentaCobrarMovimiento extends Model
{
    use BelongsToTenantViaRelacion;
    use EsLibroDeMovimientos;

    /** @use HasFactory<CuentaCobrarMovimientoFactory> */
    use HasFactory;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'cuenta_cobrar_movimientos';

    protected function casts(): array
    {
        return ['monto' => 'decimal:2', 'saldo_antes' => 'decimal:2', 'saldo_despues' => 'decimal:2', 'fecha' => 'datetime'];
    }

    /**
     * Como el de BelongsToTenantViaRelacion, con el tipo del modelo.
     *
     * @return Builder<CuentaCobrarMovimiento>
     */
    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    public static function tenantRelacion(): string
    {
        return 'cuenta';
    }

    /** @return BelongsTo<CuentaCobrar, $this> */
    public function cuenta(): BelongsTo
    {
        return $this->belongsTo(CuentaCobrar::class, 'cuenta_cobrar_id');
    }
}
